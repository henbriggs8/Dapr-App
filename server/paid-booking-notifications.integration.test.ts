import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { bookings, notificationEvents, users } from "@shared/schema";
import { db } from "./db";
import { markNativeBookingPaid } from "./native-payment-contract";
import { dispatchPaidBookingNotifications, runPaidBookingNotificationDispatch } from "./paid-booking-notifications";

async function run() {
  const marker = `notification-outbox-test-${Date.now()}`;
  // Raw SQL deliberately lists only legacy columns so this pre-migration test
  // can verify outbox compatibility without applying the presence migration.
  const insertedUser = await db.execute(sql`
    INSERT INTO users (username, password) VALUES (${marker}, 'test-only') RETURNING id
  `);
  const user = { id: Number((insertedUser.rows[0] as { id: number }).id) };
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
    // finalize payment, and it creates one admin delivery plus one Provider
    // marketplace fanout event in the same transaction.
    const [first, second] = await Promise.all([
      markNativeBookingPaid(booking.id, "pi_notification_test"),
      markNativeBookingPaid(booking.id, "pi_notification_test"),
    ]);
    assert.equal([first, second].filter(result => result?.newlyPaid).length, 1);
    const rows = await db.select().from(notificationEvents).where(eq(notificationEvents.bookingId, booking.id));
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(row => row.idempotencyKey).sort(), [
      `booking.payment_completed:${booking.id}:admin`,
      `booking.payment_completed:${booking.id}:provider_job_available`,
    ]);
    const adminRow = rows.find(row => row.notificationType === "paid_booking_admin")!;

    // The operational gate never changes payment/outbox state and never invokes
    // the sender. Restore the process environment before testing the real race.
    const originalDispatchGate = process.env.BOOKING_NOTIFICATION_DISPATCH_ENABLED;
    process.env.BOOKING_NOTIFICATION_DISPATCH_ENABLED = "false";
    let disabledResendCalls = 0;
    await runPaidBookingNotificationDispatch(async () => {
      disabledResendCalls += 1;
      return { messageId: "must-not-send" };
    });
    assert.equal(disabledResendCalls, 0);
    const [stillPending] = await db.select().from(notificationEvents).where(eq(notificationEvents.id, adminRow.id));
    assert.equal(stillPending.status, "pending");
    if (originalDispatchGate === undefined) delete process.env.BOOKING_NOTIFICATION_DISPATCH_ENABLED;
    else process.env.BOOKING_NOTIFICATION_DISPATCH_ENABLED = originalDispatchGate;

    // Two workers race to drain the same two-row outbox. The injected delivery
    // adapter prevents any email or push and verifies each lease is exclusive.
    let resendCalls = 0;
    const fakeResend = async () => {
      resendCalls += 1;
      return { messageId: "test-resend-message-id" };
    };
    await Promise.all([
      runPaidBookingNotificationDispatch(fakeResend),
      runPaidBookingNotificationDispatch(fakeResend),
    ]);
    assert.equal(resendCalls, 2, "each of the two outbox events is delivered once across racing workers");
    const finalRows = await db.select().from(notificationEvents).where(eq(notificationEvents.idempotencyKey, adminRow.idempotencyKey));
    assert.equal(finalRows.length, 1, "deterministic key must still map to one notification record");
    assert.equal(finalRows[0].status, "sent");
    assert.equal(finalRows[0].providerMessageId, "test-resend-message-id");
    const [reloaded] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    assert.equal(reloaded.isPaid, true);
    assert.equal(reloaded.status, "confirmed");

    // A delivery adapter failure changes only its outbox row. Payment remains
    // authoritative and the event stays independently retryable.
    const [failureEvent] = await db.insert(notificationEvents).values({
      eventType: "booking.payment_completed",
      bookingId: booking.id,
      userId: user.id,
      recipient: "test-only@example.invalid",
      channel: "email",
      provider: "injected-test",
      notificationType: "paid_booking_admin",
      status: "pending",
      createdAt: new Date(0),
      idempotencyKey: `booking.payment_completed:${booking.id}:forced_failure`,
      metadata: {},
    }).returning();
    await dispatchPaidBookingNotifications(1, async () => {
      throw new Error("injected notification failure");
    });
    const [failed] = await db.select().from(notificationEvents).where(eq(notificationEvents.id, failureEvent.id));
    assert.equal(failed.status, "failed");
    assert.match(failed.errorMessage ?? "", /injected notification failure/);
    const [stillPaid] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    assert.equal(stillPaid.isPaid, true);
    assert.equal(stillPaid.status, "confirmed");
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
