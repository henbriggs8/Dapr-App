import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareTestDatabase, redactDatabaseUrl, requireSafeTestDatabaseUrl } from "./test/test-database";

const testDatabaseUrl = requireSafeTestDatabaseUrl();
console.log(`[arrive-now-test] Isolated database: ${redactDatabaseUrl(testDatabaseUrl)}`);
process.env.DATABASE_URL = testDatabaseUrl;

const pool = await prepareTestDatabase(testDatabaseUrl);
for (const migration of ["0002_native_quote_payment_contract.sql", "0003_arrive_now_capacity.sql"]) {
  await pool.query(await readFile(new URL(`../migrations/${migration}`, import.meta.url), "utf8"));
}

const runId = `arrive_now_it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let applicationPool: { end(): Promise<void> } | undefined;

async function main() {
  const { db, pool: importedApplicationPool } = await import("./db");
  applicationPool = importedApplicationPool;
  const { bookings, savedAddresses, services, timeSlots, users, vehicles } = await import("@shared/schema");
  const { eq, inArray } = await import("drizzle-orm");
  const { confirmZeroAmountBooking, createBookingFromQuote, createNativeQuote, refundReferralCreditsForFailedPayment } = await import("./native-payment-contract");
  const { publishTimeSlotCapacity, unpublishTimeSlotCapacity } = await import("./time-slot-capacity");
  const { storage } = await import("./storage");

  const createdUserIds: number[] = [];
  const createdBookingIds: number[] = [];
  const createdQuoteIds: string[] = [];
  const createdSlotIds: number[] = [];
  let serviceId: number | undefined;
  try {
    const [service] = await db.insert(services).values({ name: runId, description: "Arrive Now integration test", price: 50, duration: 60, category: "basic" }).returning();
    serviceId = service.id;

    async function customer(label: string) {
      const [user] = await db.insert(users).values({ username: `${runId}_${label}`, password: "not-for-login", isProvider: false, isAdmin: false }).returning();
      createdUserIds.push(user.id);
      const [vehicle] = await db.insert(vehicles).values({ userId: user.id, year: 2025, make: "Test", model: label }).returning();
      const [address] = await db.insert(savedAddresses).values({ userId: user.id, label: "test", address: `${runId} address` }).returning();
      return { user, vehicle, address };
    }

    const first = await customer("first");
    const second = await customer("second");
    const paidCustomer = await customer("paid");
    const [contendedSlot] = await db.insert(timeSlots).values({ date: "2099-01-01", startTime: "10:00", endTime: "11:00", isAvailable: true, maxBookings: 1, currentBookings: 0, isPublished: true }).returning();
    const [paidSlot] = await db.insert(timeSlots).values({ date: "2099-01-01", startTime: "11:00", endTime: "12:00", isAvailable: true, maxBookings: 1, currentBookings: 0, isPublished: true }).returning();
    createdSlotIds.push(contendedSlot.id, paidSlot.id);

    const [existingCapacitySlot] = await db.insert(timeSlots).values({
      date: "2099-12-30",
      startTime: "09:00",
      endTime: "10:00",
      isAvailable: false,
      maxBookings: 3,
      currentBookings: 2,
      isPublished: false,
    }).returning();
    createdSlotIds.push(existingCapacitySlot.id);
    const publication = await publishTimeSlotCapacity({
      date: "2099-12-30",
      startTime: "09:00",
      endTime: "11:00",
      slotDurationMinutes: 60,
      maxBookings: 1,
    });
    createdSlotIds.push(...publication.slots.filter(slot => slot.id !== existingCapacitySlot.id).map(slot => slot.id));
    assert.equal(publication.createdCount, 1);
    assert.equal(publication.updatedCount, 1);
    assert.equal(publication.slots[0].currentBookings, 2, "publishing never resets current bookings");
    assert.equal(publication.slots[0].maxBookings, 2, "publishing never lowers capacity below current bookings");
    assert.equal(publication.slots[0].isAvailable, true);
    assert.equal(publication.slots[0].isPublished, true);
    const unpublication = await unpublishTimeSlotCapacity({
      date: "2099-12-30",
      startTime: "09:00",
      endTime: "11:00",
      slotDurationMinutes: 60,
    });
    assert.equal(unpublication.unpublishedCount, 2);
    assert.ok(unpublication.slots.every(slot => !slot.isPublished));
    assert.equal(unpublication.slots[0].currentBookings, 2, "unpublishing leaves reservations untouched");

    async function quote(customer: typeof first, slotId: number, time: string, key: string) {
      const created = await createNativeQuote(customer.user.id, `${runId}:quote:${key}`, {
        serviceId: service.id,
        timeSlotId: slotId,
        vehicleId: customer.vehicle.id,
        serviceLocation: customer.address.address,
        serviceLocationType: "home",
        date: "2099-01-01",
        time,
        addOnIds: [],
        fulfillmentMode: "scheduled",
      });
      createdQuoteIds.push(created.id);
      return created;
    }

    const [firstQuote, secondQuote] = await Promise.all([
      quote(first, contendedSlot.id, "10:00", "first"),
      quote(second, contendedSlot.id, "10:00", "second"),
    ]);
    const attempts = await Promise.allSettled([
      createBookingFromQuote(first.user.id, firstQuote.id, `${runId}:booking:first`),
      createBookingFromQuote(second.user.id, secondQuote.id, `${runId}:booking:second`),
    ]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(attempts.filter(result => result.status === "rejected" && (result.reason as any)?.code === "TIME_SLOT_UNAVAILABLE").length, 1);
    const winner = attempts.find(result => result.status === "fulfilled") as PromiseFulfilledResult<any>;
    createdBookingIds.push(winner.value.id);
    let [slotAfterReserve] = await db.select().from(timeSlots).where(eq(timeSlots.id, contendedSlot.id));
    assert.equal(slotAfterReserve.currentBookings, 1);

    await refundReferralCreditsForFailedPayment(winner.value.id, "payment_failed");
    await refundReferralCreditsForFailedPayment(winner.value.id, "payment_failed");
    [slotAfterReserve] = await db.select().from(timeSlots).where(eq(timeSlots.id, contendedSlot.id));
    assert.equal(slotAfterReserve.currentBookings, 0, "repeated terminal events release exactly once");

    const terminalStatuses = ["payment_cancelled", "payment_expired"] as const;
    for (let index = 0; index < terminalStatuses.length; index++) {
      const terminalStatus = terminalStatuses[index];
      const terminalCustomer = await customer(terminalStatus);
      const startHour = 12 + index;
      const [terminalSlot] = await db.insert(timeSlots).values({
        date: "2099-01-01",
        startTime: `${startHour}:00`,
        endTime: `${startHour + 1}:00`,
        isAvailable: true,
        maxBookings: 1,
        currentBookings: 0,
        isPublished: true,
      }).returning();
      createdSlotIds.push(terminalSlot.id);
      const terminalQuote = await quote(terminalCustomer, terminalSlot.id, `${startHour}:00`, terminalStatus);
      const terminalBooking = await createBookingFromQuote(terminalCustomer.user.id, terminalQuote.id, `${runId}:booking:${terminalStatus}`);
      createdBookingIds.push(terminalBooking.id);
      await refundReferralCreditsForFailedPayment(terminalBooking.id, terminalStatus);
      await refundReferralCreditsForFailedPayment(terminalBooking.id, terminalStatus);
      const [releasedSlot] = await db.select().from(timeSlots).where(eq(timeSlots.id, terminalSlot.id));
      assert.equal(releasedSlot.currentBookings, 0, `${terminalStatus} releases exactly once`);
    }

    const paidQuote = await quote(paidCustomer, paidSlot.id, "11:00", "paid");
    const paidBooking = await createBookingFromQuote(paidCustomer.user.id, paidQuote.id, `${runId}:booking:paid`);
    createdBookingIds.push(paidBooking.id);
    await confirmZeroAmountBooking(paidBooking.id);
    await refundReferralCreditsForFailedPayment(paidBooking.id, "payment_cancelled");
    const [slotAfterPaidEvent] = await db.select().from(timeSlots).where(eq(timeSlots.id, paidSlot.id));
    assert.equal(slotAfterPaidEvent.currentBookings, 1, "paid bookings keep capacity");

    const visible = await storage.getUnassignedBookings();
    assert.equal(visible.some(booking => booking.id === winner.value.id), false, "unpaid booking is not provider-visible");
    assert.equal(visible.some(booking => booking.id === paidBooking.id), true, "paid confirmed booking is provider-visible");
    console.log("[arrive-now-test] PASS: atomic reserve, one-time release, paid retention, and provider gate verified.");
  } finally {
    if (createdQuoteIds.length) await pool.query("DELETE FROM booking_quotes WHERE id = ANY($1::text[])", [createdQuoteIds]);
    if (createdBookingIds.length) await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
    if (createdSlotIds.length) await db.delete(timeSlots).where(inArray(timeSlots.id, createdSlotIds));
    if (createdUserIds.length) {
      await db.delete(savedAddresses).where(inArray(savedAddresses.userId, createdUserIds));
      await db.delete(vehicles).where(inArray(vehicles.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    if (serviceId) await db.delete(services).where(eq(services.id, serviceId));
  }
}

let failure: unknown;
try {
  await main();
} catch (error) {
  failure = error;
  console.error("[arrive-now-test] FAIL:", error);
} finally {
  await applicationPool?.end();
  await pool.end();
}
if (failure) throw failure;
