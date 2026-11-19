import { requireLocalIntegrationDatabase } from "./test/isolated-integration";
requireLocalIntegrationDatabase();
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { once } from "node:events";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { storage } from "./storage";
import { bookingQuotes, bookings, savedAddresses, services, timeSlots, users, vehicles } from "@shared/schema";
import { createBookingFromQuote, createNativeQuote, NativeContractError } from "./native-payment-contract";
import { getAsapAvailability } from "./asap-availability";
import { registerRoutes } from "./routes";

let server: ReturnType<typeof registerRoutes> | undefined;
try {
  await storage.initialize();
  const catalog = await db.select().from(services);
  assert.equal(catalog.length, 3);
  assert.deepEqual(catalog.map(s => s.category).sort(), ["basic", "premium", "standard"]);
  const [interior] = await db.insert(services).values({ name: "Interior Detail", description: "Historical", category: "interior", price: 89, duration: 60 }).returning();
  const [duplicate] = await db.insert(services).values({ name: "Legacy Basic", description: "Preserved reference", category: "basic", price: 39, duration: 30 }).returning();
  const [customer] = await db.insert(users).values({ username: "catalog_customer", password: "synthetic", isProvider: false, isAdmin: false }).returning();
  const [provider] = await db.insert(users).values({ username: "catalog_provider", password: "synthetic", isProvider: true, isAdmin: false }).returning();
  const [vehicle] = await db.insert(vehicles).values({ userId: customer.id, year: 2025, make: "Synthetic", model: "Test" }).returning();
  const [address] = await db.insert(savedAddresses).values({ userId: customer.id, label: "Test", address: "Synthetic address" }).returning();
  const [slot] = await db.insert(timeSlots).values({ date: "2099-01-01", startTime: "10:00", endTime: "11:30", isPublished: true, isAvailable: true, maxBookings: 10, currentBookings: 0 }).returning();
  const [historical] = await db.insert(bookings).values({ userId: customer.id, providerId: provider.id, serviceId: interior.id,
    priceTier: "interior", timestamp: new Date().toISOString(), serviceLocation: "Synthetic", serviceLocationType: "home",
    status: "completed", isPaid: true, providerEarnings: 5785, amount: 8900, totalPrice: 89, paymentId: "synthetic_historical_payment" }).returning();
  const [oldDuplicateBooking] = await db.insert(bookings).values({ userId: customer.id, serviceId: duplicate.id,
    priceTier: "basic", timestamp: new Date().toISOString(), serviceLocation: "Synthetic", serviceLocationType: "home", status: "completed" }).returning();
  await storage.initialize();
  assert.deepEqual(await storage.getBookingById(historical.id), historical, "initialization preserves all finalized historical fields");
  assert.equal((await storage.getBookingById(oldDuplicateBooking.id))!.serviceId, duplicate.id, "never repoint historical references");
  assert.deepEqual(await storage.getServiceById(interior.id), interior);
  assert.ok(await storage.getServiceById(duplicate.id), "never delete duplicate service records");
  assert.ok((await storage.getProviderBookings(provider.id)).some(b => b.id === historical.id));

  const base = { vehicleId: vehicle.id, fulfillmentMode: "scheduled", timeSlotId: slot.id, date: slot.date, time: slot.startTime,
    serviceLocation: address.address, serviceLocationType: "home", applyReferralCredits: false };
  let template: Awaited<ReturnType<typeof createNativeQuote>> | undefined;
  for (const service of catalog.filter(s => ["basic", "standard"].includes(s.category))) {
    const quote = await createNativeQuote(customer.id, randomUUID(), { ...base, serviceId: service.id });
    template = quote;
    const booking = await createBookingFromQuote(customer.id, quote.id, randomUUID());
    assert.equal(booking.serviceId, service.id);
    assert.equal(booking.amount, service.price * 100);
  }
  const isBlocked = (e: unknown) => e instanceof NativeContractError && e.status === 409 && e.code === "SERVICE_NOT_BOOKABLE";
  for (const service of [catalog.find(s => s.category === "premium")!, interior, duplicate]) {
    await assert.rejects(createNativeQuote(customer.id, randomUUID(), { ...base, serviceId: service.id, isBookable: true }), isBlocked);
    await assert.rejects(getAsapAvailability(customer.id, { addressId: address.id, vehicleId: vehicle.id, serviceId: service.id }), isBlocked);
    const [stale] = await db.insert(bookingQuotes).values({ ...template!, id: randomUUID(), idempotencyKey: randomUUID(),
      serviceId: service.id, priceTier: service.category, bookingId: null, consumedAt: null }).returning();
    const beforeSlot = await storage.getTimeSlotById(slot.id);
    const beforeCount = await db.select({ count: sql<number>`count(*)::int` }).from(bookings);
    await assert.rejects(createBookingFromQuote(customer.id, stale.id, randomUUID()), isBlocked);
    assert.deepEqual(await storage.getTimeSlotById(slot.id), beforeSlot, "blocked booking must not reserve capacity");
    assert.deepEqual(await db.select({ count: sql<number>`count(*)::int` }).from(bookings), beforeCount);
    assert.equal((await db.select().from(bookingQuotes).where(eq(bookingQuotes.id, stale.id)))[0].consumedAt, null);
  }
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.user = customer; next(); });
  server = registerRoutes(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  for (const service of [catalog.find(s => s.category === "premium")!, interior, duplicate]) {
    const response = await fetch(origin + "/api/bookings/legacy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serviceId: service.id, isBookable: true }) });
    assert.equal(response.status, 409); assert.equal((await response.json()).code, "SERVICE_NOT_BOOKABLE");
  }
  const apiServices = await (await fetch(origin + "/api/services")).json();
  assert.equal(apiServices.find((s: any) => s.id === interior.id).customerVisible, false);
  assert.equal(apiServices.find((s: any) => s.category === "premium").displayPrice, null);
  assert.deepEqual(await storage.getBookingById(historical.id), historical);
  console.log("PASS: real PostgreSQL permits only two canonical tiers; rejects blocked quotes, ASAP, stale quote consumption and legacy HTTP booking; preserves capacity, history, provider lookup and finalized earnings");
} finally {
  if (server) { server.emit("dapr:shutdown"); server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
  await pool.end();
}
