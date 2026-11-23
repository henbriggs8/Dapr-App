import { requireLocalIntegrationDatabase } from "./test/isolated-integration";
requireLocalIntegrationDatabase();
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { bookings, notificationEvents, providerApplications, services, timeSlots, users, vehicles } from "@shared/schema";
import { attachNativePaymentIntent, confirmZeroAmountBooking, createBookingFromQuote, createNativeQuote, markNativeBookingPaid, redeemFreeWashCreditBooking } from "./native-payment-contract";
import { cancelUnpaidNativeBooking } from "./unpaid-booking-cancellation";
import { registerRoutes } from "./routes";

let server: ReturnType<typeof registerRoutes> | undefined;
try {
  await storage.initialize();
  const [customer] = await db.insert(users).values({ username: "clerk_compat_customer", password: "synthetic", referralCreditBalanceCents: 500, freeWashCredits: 1 }).returning();
  const [other] = await db.insert(users).values({ username: "clerk_compat_other", password: "synthetic" }).returning();
  const [provider] = await db.insert(users).values({ username: "clerk_compat_provider", password: "synthetic", isProvider: true, currentStatus: "online", lastHeartbeatAt: new Date() }).returning();
  await db.insert(providerApplications).values({ userId: provider.id, applicationStatus: "active_provider", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const [vehicle] = await db.insert(vehicles).values({ userId: customer.id, year: 2025, make: "Synthetic", model: "Test" }).returning();
  const [slot] = await db.insert(timeSlots).values({ date: "2099-01-01", startTime: "10:00", endTime: "12:00", isPublished: true, isAvailable: true, maxBookings: 20 }).returning();
  const catalog = await db.select().from(services); const essential = catalog.find(s => s.category === "basic")!;
  const fresh = async (credit = false) => {
    const q = await createNativeQuote(customer.id, randomUUID(), { serviceId: essential.id, vehicleId: vehicle.id, fulfillmentMode: "scheduled", timeSlotId: slot.id, date: slot.date, time: slot.startTime, serviceLocation: "Synthetic test", serviceLocationType: "other", applyReferralCredits: credit });
    return createBookingFromQuote(customer.id, q.id, randomUUID());
  };
  const b = await fresh(true);
  assert.equal(b.referralCreditAppliedCents, 500);
  assert.equal((await storage.getUser(customer.id))!.referralCreditBalanceCents, 0);
  await assert.rejects(cancelUnpaidNativeBooking(other.id, b.id), e => (e as any).status === 403);
  const cancels = await Promise.all([cancelUnpaidNativeBooking(customer.id, b.id), cancelUnpaidNativeBooking(customer.id, b.id)]);
  assert.equal(cancels.filter(x => x.newlyCancelled).length, 1);
  assert.equal((await storage.getUser(customer.id))!.referralCreditBalanceCents, 500);
  assert.equal((await storage.getTimeSlotById(slot.id))!.currentBookings, 0);
  for (const action of [
    () => attachNativePaymentIntent(b.id, randomUUID(), "pi_synthetic"),
    () => markNativeBookingPaid(b.id, "pi_synthetic"),
    () => confirmZeroAmountBooking(b.id),
    () => redeemFreeWashCreditBooking(b.id, customer.id),
    () => storage.updateBookingPaymentInfo(b.id, { stripeSessionId: "pi_synthetic" }),
  ]) await assert.rejects(action(), e => (e as any).code === "BOOKING_CANCELLED");
  assert.equal((await storage.getUser(customer.id))!.freeWashCredits, 1);
  assert.equal((await db.select().from(notificationEvents)).length, 0);
  // ASAP has no slot-release marker: cancellation itself must prevent a late
  // success/zero-credit path from resurrecting it.
  const asapQuote = await createNativeQuote(customer.id, randomUUID(), { serviceId: essential.id, vehicleId: vehicle.id, fulfillmentMode: "asap", serviceLocation: "Synthetic ASAP", serviceLocationType: "other", applyReferralCredits: false });
  const asap = await createBookingFromQuote(customer.id, asapQuote.id, randomUUID());
  const cancelledAsap = await cancelUnpaidNativeBooking(customer.id, asap.id);
  assert.equal(cancelledAsap.booking.slotReservationReleasedAt, null);
  await assert.rejects(markNativeBookingPaid(asap.id, "pi_synthetic_late"), e => (e as any).code === "BOOKING_CANCELLED");
  await assert.rejects(confirmZeroAmountBooking(asap.id), e => (e as any).code === "BOOKING_CANCELLED");
  const existing = await fresh(); await attachNativePaymentIntent(existing.id, randomUUID(), "pi_fixture_existing");
  const snapshot = await storage.getBookingById(existing.id);
  await assert.rejects(cancelUnpaidNativeBooking(customer.id, existing.id), e => (e as any).code === "PAYMENT_RECONCILIATION_REQUIRED");
  assert.deepEqual(await storage.getBookingById(existing.id), snapshot);
  const race = await fresh();
  const outcomes = await Promise.allSettled([cancelUnpaidNativeBooking(customer.id, race.id), attachNativePaymentIntent(race.id, randomUUID(), "pi_fixture_race")]);
  const afterRace = (await storage.getBookingById(race.id))!;
  assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 1);
  assert(afterRace.status === "cancelled" ? afterRace.stripeSessionId === null : afterRace.stripeSessionId === "pi_fixture_race");

  // Exercise actual Express routes without cookies. Verification is a local
  // synthetic double; live Clerk JWT signatures are checked separately in staging.
  const verifyToken = async (token: string) => {
    if (!["customer", "other", "provider"].includes(token)) throw new Error("Synthetic invalid token");
    return { sub: `compat_${token}` };
  };
  const app = express(); app.use(express.json()); server = registerRoutes(app, { verifyToken });
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert(address && typeof address === "object"); const origin = `http://127.0.0.1:${address.port}`;
  async function request(method: string, path: string, who?: string, body?: unknown) {
    return fetch(origin + path, { method, headers: { "content-type": "application/json", ...(who ? { authorization: `Bearer ${who}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  assert.equal((await request("GET", "/api/provider/available-jobs")).status, 401);
  assert.equal((await request("GET", "/api/provider/available-jobs", "invalid")).status, 401);
  assert.equal((await request("GET", "/api/provider/available-jobs", "customer")).status, 401);
  assert.equal((await request("GET", "/api/provider/available-jobs", "provider")).status, 200);
  const routeCancellation = await fresh();
  assert.equal((await request("PATCH", `/api/bookings/${routeCancellation.id}/cancel`, "other", {})).status, 403);
  for (let i = 0; i < 2; i++) {
    const r = await request("PATCH", `/api/bookings/${routeCancellation.id}/cancel`, "customer", {});
    assert.equal(r.status, 200); assert.equal((await r.json()).status, "cancelled");
  }
  const live = await fresh();
  assert.equal((await request("POST", `/api/provider/accept-job/${live.id}`, "provider", {})).status, 400);
  await db.update(bookings).set({ isPaid: true, status: "confirmed", paymentStatus: "paid" }).where(eq(bookings.id, live.id));
  assert.equal((await request("POST", `/api/provider/accept-job/${live.id}`, "provider", {})).status, 200);
  assert.equal((await request("POST", `/api/bookings/${live.id}/start`, "provider", {})).status, 409);
  assert.equal((await request("POST", `/api/bookings/${live.id}/status`, "customer", { status: "on_the_way" })).status, 403);
  for (const [path, body] of [["status", { status: "on_the_way" }], ["arrive", { baseDurationMinutes: 30 }], ["start", {}], ["complete", {}]] as const) {
    const r = await request("POST", `/api/bookings/${live.id}/${path}`, "provider", body); assert.equal(r.status, 200, path);
  }
  const finished = (await storage.getBookingById(live.id))!; assert.equal(finished.providerEarnings, 2535);
  const retried = await request("POST", `/api/bookings/${live.id}/complete`, "provider", {}); assert.equal(retried.status, 200); assert.equal((await retried.json()).endTime, finished.endTime);
  assert.equal((await request("GET", "/api/services", "provider")).status, 200);
  console.log("PASS: unpaid cancellation/ownership/idempotency/credits/capacity; payment attachment race and no resurrection; actual provider bearer-only job, acceptance and lifecycle routes; canonical earnings and retry protection");
} finally {
  if (server) { server.emit("dapr:shutdown"); server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
  await pool.end();
}
