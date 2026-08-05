/**
 * Development-only integration test for provider acceptance persistence:
 * accepting a job must set status='assigned', currentStage='assigned', and
 * acceptedAt exactly once; retries must be rejected and never reset the
 * original timestamps.
 *
 * Run with: npm run test:booking-acceptance
 * Uses a synthetic throwaway booking in the Development database; all test
 * rows are deleted afterwards. Refuses to run inside a Replit deployment.
 */
import assert from "node:assert/strict";

if (process.env.REPLIT_DEPLOYMENT) {
  throw new Error("Refusing to run the booking acceptance integration test in a deployment.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("A Development DATABASE_URL is required.");
}

const { db } = await import("./db");
const { storage } = await import("./storage");
const { bookings, users } = await import("@shared/schema");
const { eq, and } = await import("drizzle-orm");

// A real provider row is not required by assignBookingToProvider's SQL guard,
// so use a synthetic provider id that cannot collide with real users.
const SYNTHETIC_PROVIDER_ID = -424242;

const [row] = await db
  .insert(bookings)
  .values({
    userId: -1,
    serviceId: -1,
    priceTier: "basic",
    timestamp: new Date().toISOString(),
    serviceLocation: "acceptance-test",
    serviceLocationType: "home",
    status: "confirmed",
    isPaid: true,
    fulfillmentMode: "asap",
    bookingRef: `TEST-${Date.now().toString(36).toUpperCase()}A`,
  })
  .returning();

try {
  // 1. First acceptance sets status, currentStage, acceptedAt, assignedAt.
  const accepted = await storage.assignBookingToProvider(row.id, SYNTHETIC_PROVIDER_ID, { acceptedByProvider: true });
  assert.equal(accepted.status, "assigned");
  assert.equal(accepted.currentStage, "assigned");
  assert.ok(accepted.acceptedAt, "acceptedAt must be populated on acceptance");
  assert.ok(accepted.assignedAt, "assignedAt must remain populated");
  assert.equal(accepted.providerId, SYNTHETIC_PROVIDER_ID);

  // 2. A retry (same or different provider) is rejected — the atomic WHERE
  //    guard no longer matches an assigned booking.
  await new Promise((r) => setTimeout(r, 20));
  await assert.rejects(
    () => storage.assignBookingToProvider(row.id, SYNTHETIC_PROVIDER_ID),
    /no longer available/i,
    "repeat acceptance must be rejected",
  );
  await assert.rejects(
    () => storage.assignBookingToProvider(row.id, SYNTHETIC_PROVIDER_ID - 1),
    /no longer available/i,
    "competing acceptance must be rejected",
  );

  // 3. A fresh reload returns the original persisted acceptance timestamps.
  const reloaded = await storage.getBookingById(row.id);
  assert.ok(reloaded);
  assert.equal(reloaded!.status, "assigned");
  assert.equal(reloaded!.currentStage, "assigned");
  assert.equal(reloaded!.acceptedAt, accepted.acceptedAt, "retry/reload must not reset acceptedAt");
  assert.equal(reloaded!.assignedAt, accepted.assignedAt, "retry/reload must not reset assignedAt");
  assert.equal(reloaded!.providerId, SYNTHETIC_PROVIDER_ID);

  // 4. Invalid acceptance transitions remain rejected: unpaid or non-confirmed
  //    bookings can never be accepted.
  const [unpaid] = await db
    .insert(bookings)
    .values({
      userId: -1,
      serviceId: -1,
      priceTier: "basic",
      timestamp: new Date().toISOString(),
      serviceLocation: "acceptance-test-unpaid",
      serviceLocationType: "home",
      status: "confirmed",
      isPaid: false,
      fulfillmentMode: "asap",
    })
    .returning();
  const [pending] = await db
    .insert(bookings)
    .values({
      userId: -1,
      serviceId: -1,
      priceTier: "basic",
      timestamp: new Date().toISOString(),
      serviceLocation: "acceptance-test-pending",
      serviceLocationType: "home",
      status: "pending",
      isPaid: true,
      fulfillmentMode: "asap",
    })
    .returning();
  try {
    await assert.rejects(() => storage.assignBookingToProvider(unpaid.id, SYNTHETIC_PROVIDER_ID, { acceptedByProvider: true }), /no longer available/i);
    await assert.rejects(() => storage.assignBookingToProvider(pending.id, SYNTHETIC_PROVIDER_ID, { acceptedByProvider: true }), /no longer available/i);
    const unpaidReload = await storage.getBookingById(unpaid.id);
    assert.equal(unpaidReload!.acceptedAt, null, "rejected acceptance must not write acceptedAt");
    assert.equal(unpaidReload!.currentStage, null, "rejected acceptance must not write currentStage");
  } finally {
    await db.delete(bookings).where(eq(bookings.id, unpaid.id));
    await db.delete(bookings).where(eq(bookings.id, pending.id));
  }

  // 5. Admin/manual assignment (no provider accept action) must NOT record
  //    acceptance — acceptedAt stays null until the explicit accept step.
  const [adminAssigned] = await db
    .insert(bookings)
    .values({
      userId: -1,
      serviceId: -1,
      priceTier: "basic",
      timestamp: new Date().toISOString(),
      serviceLocation: "acceptance-test-admin",
      serviceLocationType: "home",
      status: "confirmed",
      isPaid: true,
      fulfillmentMode: "asap",
    })
    .returning();
  try {
    const assigned = await storage.assignBookingToProvider(adminAssigned.id, SYNTHETIC_PROVIDER_ID);
    assert.equal(assigned.status, "assigned");
    assert.equal(assigned.currentStage, "assigned");
    assert.equal(assigned.acceptedAt, null, "admin assignment must not fabricate acceptedAt");
  } finally {
    await db.delete(bookings).where(eq(bookings.id, adminAssigned.id));
  }

  console.log("booking acceptance integration test: all assertions passed");
  await db.delete(bookings).where(eq(bookings.id, row.id));
  process.exit(0);
} catch (error) {
  await db.delete(bookings).where(eq(bookings.id, row.id)).catch(() => {});
  console.error(error);
  process.exit(1);
}
