/**
 * Development-only integration test for booking lifecycle persistence:
 * arrived → in_progress → completed must keep status, currentStage, and the
 * arrival/start/end timestamps in sync, and idempotent retries must never
 * reset an already-recorded timestamp.
 *
 * Run with: npm run test:booking-lifecycle
 * Uses the Development database via a throwaway booking row that is deleted
 * in a finally block. Refuses to run inside a Replit deployment.
 */
import assert from "node:assert/strict";

if (process.env.REPLIT_DEPLOYMENT) {
  throw new Error("Refusing to run the booking lifecycle integration test in a deployment.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("A Development DATABASE_URL is required.");
}

const { db } = await import("./db");
const { storage } = await import("./storage");
const { bookings } = await import("@shared/schema");
const { eq } = await import("drizzle-orm");

const [row] = await db
  .insert(bookings)
  .values({
    userId: -1,
    serviceId: -1,
    priceTier: "basic",
    timestamp: new Date().toISOString(),
    serviceLocation: "lifecycle-test",
    serviceLocationType: "home",
    status: "on_the_way",
    currentStage: "on_the_way",
    fulfillmentMode: "asap",
    bookingRef: `TEST-${Date.now().toString(36).toUpperCase()}`,
  })
  .returning();

try {
  // 1. Marking arrived sets status, stage, and arrivalTime.
  const arrived = await storage.markArrived(row.id, 60);
  assert.equal(arrived.status, "arrived");
  assert.equal(arrived.currentStage, "arrived");
  assert.ok(arrived.arrivalTime, "arrivalTime must be populated on arrival");
  assert.equal(arrived.startTime, null, "arrival must not start billable service time");
  assert.equal(arrived.estimatedCompletionTime, null, "completion estimate begins when service starts");

  // 2. An idempotent arrived retry preserves the original arrivalTime.
  await new Promise((r) => setTimeout(r, 20));
  const arrivedRetry = await storage.markArrived(row.id, 60);
  assert.equal(arrivedRetry.arrivalTime, arrived.arrivalTime, "retry must not reset arrivalTime");

  // 3. Starting service updates status, stage, and startTime once.
  const started = await storage.startServiceTimer(row.id);
  assert.equal(started.status, "in_progress");
  assert.equal(started.currentStage, "in_progress");
  assert.ok(started.startTime, "startTime must be populated on start");
  assert.ok(started.estimatedCompletionTime, "completion estimate begins when service starts");
  assert.equal(started.arrivalTime, arrived.arrivalTime, "start must not disturb arrivalTime");

  await new Promise((r) => setTimeout(r, 20));
  const startedRetry = await storage.startServiceTimer(row.id);
  assert.equal(startedRetry.startTime, started.startTime, "retry must not reset startTime");

  // 4. Completing service updates status, stage, endTime, and duration once.
  const completed = await storage.completeServiceTimer(row.id);
  assert.equal(completed.status, "completed");
  assert.equal(completed.currentStage, "completed");
  assert.ok(completed.endTime, "endTime must be populated on completion");
  assert.ok(typeof completed.serviceDuration === "number", "serviceDuration must be recorded");

  await new Promise((r) => setTimeout(r, 20));
  const completedRetry = await storage.completeServiceTimer(row.id);
  assert.equal(completedRetry.endTime, completed.endTime, "retry must not reset endTime");
  assert.equal(completedRetry.serviceDuration, completed.serviceDuration, "retry must not recompute duration");

  // 5. A fresh reload (relaunch) returns the persisted arrival and durations.
  const reloaded = await storage.getBookingById(row.id);
  assert.ok(reloaded);
  assert.equal(reloaded!.status, "completed");
  assert.equal(reloaded!.currentStage, "completed");
  assert.equal(reloaded!.arrivalTime, arrived.arrivalTime);
  assert.equal(reloaded!.startTime, started.startTime);
  assert.equal(reloaded!.endTime, completed.endTime);
  assert.equal(reloaded!.serviceDuration, completed.serviceDuration);

  // 6. Explicit stage arguments still win over the status-derived default.
  const [stageRow] = await db
    .insert(bookings)
    .values({
      userId: -1,
      serviceId: -1,
      priceTier: "basic",
      timestamp: new Date().toISOString(),
      serviceLocation: "lifecycle-test-stage",
      serviceLocationType: "home",
      status: "on_the_way",
      fulfillmentMode: "asap",
    })
    .returning();
  try {
    const explicit = await storage.updateBookingStatus(stageRow.id, "arrived", "setting_up");
    assert.equal(explicit.currentStage, "setting_up", "explicit stage must be preserved");
    assert.ok(explicit.arrivalTime, "arrivalTime still populated with explicit stage");
  } finally {
    await db.delete(bookings).where(eq(bookings.id, stageRow.id));
  }

  // 7. Concurrent unpaid→paid claims: exactly one caller wins, so the
  //    confirmed push can never duplicate across webhook/confirm/verify paths.
  const [payRow] = await db
    .insert(bookings)
    .values({
      userId: -1,
      serviceId: -1,
      priceTier: "basic",
      timestamp: new Date().toISOString(),
      serviceLocation: "lifecycle-test-paid-claim",
      serviceLocationType: "home",
      status: "awaiting_payment",
      isPaid: false,
      fulfillmentMode: "asap",
    })
    .returning();
  try {
    const claims = await Promise.all([
      storage.claimPaidTransition(payRow.id),
      storage.claimPaidTransition(payRow.id),
      storage.claimPaidTransition(payRow.id),
    ]);
    assert.equal(claims.filter(Boolean).length, 1, "exactly one concurrent claim must win");
    assert.equal(await storage.claimPaidTransition(payRow.id), false, "later retries must not claim again");
    const paidReload = await storage.getBookingById(payRow.id);
    assert.equal(paidReload!.isPaid, true);
  } finally {
    await db.delete(bookings).where(eq(bookings.id, payRow.id));
  }

  console.log("booking lifecycle integration test: all assertions passed");
  await db.delete(bookings).where(eq(bookings.id, row.id));
  process.exit(0);
} catch (error) {
  await db.delete(bookings).where(eq(bookings.id, row.id)).catch(() => {});
  console.error(error);
  process.exit(1);
}
