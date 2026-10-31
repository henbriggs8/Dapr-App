import { requireLocalIntegrationDatabase } from "./test/isolated-integration";
requireLocalIntegrationDatabase();
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { bookings, bookingQuotes, providerApplications, services, users } from "@shared/schema";
import { DatabaseStorage } from "./storage";
import { approveLegacyProvider } from "./legacy-provider-approval";

try {
  const [customer] = await db.insert(users).values({ username: "railway_customer_fixture", password: "not-a-login" }).returning();
  const [provider] = await db.insert(users).values({ username: "railway_provider_fixture", password: "not-a-login", isProvider: true, currentStatus: "online" }).returning();
  const [service] = await db.insert(services).values({ name: "fixture", description: "synthetic", price: 149, duration: 60, category: "test" }).returning();
  const now = new Date().toISOString();
  await db.insert(bookingQuotes).values({ id: "quote_railway_fixture", userId: customer.id, idempotencyKey: "quote-fixture", requestFingerprint: "fixture",
    serviceId: service.id, vehicleId: -1, date: "", time: "", priceTier: "basic", serviceLocation: "synthetic", serviceLocationType: "home", fulfillmentMode: "asap",
    subtotalCents: 14900, totalAmountCents: 149, expiresAt: "2099-01-01T00:00:00.000Z", createdAt: now });
  const [booking] = await db.insert(bookings).values({ userId: customer.id, providerId: provider.id, serviceId: service.id, quoteId: "quote_railway_fixture",
    priceTier: "basic", timestamp: now, serviceLocation: "synthetic", serviceLocationType: "home", status: "in_progress", startTime: now,
    amount: 149, totalPrice: 1, isPaid: true, paymentStatus: "completed", paymentId: "pi_synthetic_fixture" }).returning();
  // Changing today's catalog must not reprice a saved quote or the customer charge.
  await db.update(services).set({ price: 999 }).where(eq(services.id, service.id));
  const storage = new DatabaseStorage();
  const [first, retry] = await Promise.all([storage.completeServiceTimer(booking.id), storage.completeServiceTimer(booking.id)]);
  assert.equal(first.providerEarnings, 9685); assert.equal(retry.providerEarnings, 9685);
  assert.equal(first.endTime, retry.endTime); assert.equal(first.amount, 149); assert.equal(first.totalPrice, 1); assert.equal(first.paymentId, "pi_synthetic_fixture");
  assert.equal((await storage.updateBookingStatus(booking.id, "completed")).providerEarnings, 9685);
  for (const finalized of [0, 11000]) {
    const [historical] = await db.insert(bookings).values({ userId: customer.id, providerId: provider.id, serviceId: service.id,
      priceTier: "basic", timestamp: now, serviceLocation: "synthetic", serviceLocationType: "home", status: "completed", startTime: now, endTime: now, providerEarnings: finalized }).returning();
    assert.equal((await storage.completeServiceTimer(historical.id)).providerEarnings, finalized);
  }
  const approvals = await Promise.all([approveLegacyProvider(provider.id, -1), approveLegacyProvider(provider.id, -1)]);
  assert.equal(approvals.filter(a => a.created).length, 1);
  assert.equal(approvals[0].applicationId, approvals[1].applicationId);
  assert.equal((await db.select().from(providerApplications).where(eq(providerApplications.userId, provider.id))).length, 1);
  console.log('PASS: real PostgreSQL completion race, quote-based 65/35, unchanged charges/finalized history and advisory-lock Provider approval');
} finally { await pool.end(); }
