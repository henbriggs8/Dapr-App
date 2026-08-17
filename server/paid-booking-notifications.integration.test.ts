import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { bookings, notificationEvents, users } from "@shared/schema";
import { db } from "./db";
import { markNativeBookingPaid } from "./native-payment-contract";
import { dispatchPaidBookingNotifications } from "./paid-booking-notifications";

async function run() {
  const marker = `notification-outbox-test-${Date.now()}`;
  const [user] = await db.insert(users).values({
    username: marker,
    password: "test-only",
  }).returning();
  const [booking] = await db.insert(bookings).values({
    userId: user.id,
    serviceId: -1,
    priceTier: "basic",
    timestamp: new Date().toISOString(),
    serviceLocation: marker,
    serviceLocationType: "home",
    status: "awaiting_payment",
    isPaid: false,
    paymentStatus: "payment_pending",
    fulfillmentMode: "asap",
  }).returning();
  try {
    // Mirrors duplicate webhook / verify delivery: only the first caller may
    // finalize payment, and it creates exactly one durable outbox row.
    const [first, second] = await Promise.all([
      markNativeBookingPaid(booking.id, "pi_notification_test"),
      markNativeBookingPaid(booking.id, "pi_notification_test"),
    ]);
    assert.equal([first, second].filter(result => result?.newlyPaid).length, 1);
    const rows = await db.select().from(notificationEvents).where(and(
      eq(notificationEvents.bookingId, booking.id),
      eq(notificationEvents.eventType, "booking.payment_completed"),
    ));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "pending");
    assert.equal(rows[0].idempotencyKey, `booking.payment_completed:${booking.id}:admin`);

    // Two workers race to drain the same one-row outbox. The injected sender
    // stands in for Resend: only the worker holding the conditional DB lease
    // may invoke it, so this test never sends any email.
    let resendCalls = 0;
    const fakeResend = async () => {
      resendCalls += 1;
      return { messageId: "test-resend-message-id" };
    };
    await Promise.all([
      dispatchPaidBookingNotifications(1, fakeResend),
      dispatchPaidBookingNotifications(1, fakeResend),
    ]);
    assert.equal(resendCalls, 1, "the losing worker must not call Resend");
    const finalRows = await db.select().from(notificationEvents).where(eq(notificationEvents.idempotencyKey, rows[0].idempotencyKey));
    assert.equal(finalRows.length, 1, "deterministic key must still map to one notification record");
    assert.equal(finalRows[0].status, "sent");
    assert.equal(finalRows[0].providerMessageId, "test-resend-message-id");
    const [reloaded] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    assert.equal(reloaded.isPaid, true);
    assert.equal(reloaded.status, "confirmed");
    console.log("paid booking notification integration test: all assertions passed");
  } finally {
    await db.delete(bookings).where(eq(bookings.id, booking.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
}

run().then(() => process.exit(0)).catch(async error => {
  console.error(error);
  process.exit(1);
});