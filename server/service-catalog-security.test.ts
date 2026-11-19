import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_SERVICE_CATALOG, bookableServices, catalogService, customerVisibleServices, isBookableService } from "@shared/service-catalog";
import { bookingQuotes, bookings, referrals, services, timeSlots, users, vehicles, type Service } from "@shared/schema";
import { requireBookableService } from "./service-catalog";
import { NativeContractError } from "./native-contract-error";
import { db } from "./db";
import { createBookingFromQuote, createNativeQuote } from "./native-payment-contract";

const rows: Service[] = CANONICAL_SERVICE_CATALOG.map((s, index) => ({ ...s, id: index + 1 }));
const interior: Service = { id: 4, name: "Interior Detail", category: "interior", price: 89, duration: 60, description: "Historical" };
const input = { serviceId: 1, vehicleId: 1, fulfillmentMode: "scheduled", timeSlotId: 1,
  date: "2099-01-01", time: "10:00", serviceLocation: "synthetic", serviceLocationType: "home" };
const blocked = (e: unknown) => e instanceof NativeContractError && e.status === 409 && e.code === "SERVICE_NOT_BOOKABLE";

test("catalog has three visible definitions and exactly the two approved bookable tiers", () => {
  const all = [...rows, interior];
  assert.deepEqual(customerVisibleServices(all).map(s => s.name), ["Essential Wash", "Refresh Detail", "Dapr Black Label Detail"]);
  assert.deepEqual(bookableServices(all).map(s => [s.name, s.price, s.duration]), [["Essential Wash", 39, 30], ["Refresh Detail", 149, 90]]);
  assert.equal(catalogService(rows[2]).displayPrice, null);
  assert.equal(catalogService(rows[2]).bookingAvailability, "coming_soon");
  assert.equal(catalogService(interior).customerVisible, false);
  assert.equal(catalogService(interior).price, 89, "historical numeric contract remains readable");
  assert.equal(isBookableService({ category: "premium", isBookable: true }), false);
  assert.equal(isBookableService({ category: "unknown" }), false);
  assert.throws(() => requireBookableService(undefined), (e: unknown) => e instanceof NativeContractError && e.code === "INVALID_SERVICE");
});

for (const service of [...rows, interior]) {
  test(`quote creation enforces catalog availability for ${service.name}`, async t => {
    let inserted = false;
    t.mock.method(db, "select", (() => ({ from: (table: unknown) => ({ orderBy: async () => [service], where: () => ({ limit: async () => {
      if (table === services) return [service];
      if (table === vehicles) return [{ id: 1, userId: 5 }];
      if (table === timeSlots) return [{ id: 1, date: input.date, startTime: input.time, isPublished: true, isAvailable: true, currentBookings: 0, maxBookings: 1 }];
      if (table === users) return [{ credit: 0 }];
      assert.ok([bookingQuotes, bookings, referrals].includes(table as any)); return [];
    } }) }) })) as any);
    t.mock.method(db, "insert", ((table: unknown) => ({ values: (value: unknown) => ({ returning: async () => {
      assert.equal(table, bookingQuotes); inserted = true; return [value];
    } }) })) as any);
    if (isBookableService(service)) {
      const quote = await createNativeQuote(5, "catalog-unit-key-1234", { ...input, serviceId: service.id });
      assert.equal(quote.serviceId, service.id); assert.equal(quote.subtotalCents, service.price * 100); assert.equal(inserted, true);
    } else {
      await assert.rejects(createNativeQuote(5, "catalog-unit-key-1234", { ...input, serviceId: service.id, isBookable: true }), blocked);
      assert.equal(inserted, false, "no quote record for a disabled service");
    }
  });
}

for (const service of [rows[2], interior]) {
  test(`unconsumed historical quotes cannot create new ${service.name} bookings`, async t => {
    let writes = 0;
    const tx = { execute: async () => {}, select: () => ({ from: (table: unknown) => ({ orderBy: async () => [service], where: () => ({ limit: async () => {
      if (table === bookings) return [];
      if (table === bookingQuotes) return [{ id: "historical-quote", userId: 5, serviceId: service.id, bookingId: null, expiresAt: "2099-01-01T00:00:00Z", fulfillmentMode: "scheduled", timeSlotId: 1 }];
      assert.equal(table, services); return [service];
    } }) }) }), update: () => { writes++; throw new Error("must reject before writes"); }, insert: () => { writes++; throw new Error("must reject before writes"); } };
    t.mock.method(db, "transaction", (async (callback: any) => callback(tx)) as any);
    await assert.rejects(createBookingFromQuote(5, "historical-quote", "new-booking-key-1234"), blocked);
    assert.equal(writes, 0, "no slot reservation, referral debit, booking or quote mutation");
  });
}

test("existing Interior bookings remain idempotently readable without repricing", async t => {
  const historical = { id: 70, userId: 5, quoteId: "old", serviceId: interior.id, providerEarnings: 5785, isPaid: true };
  const tx = { execute: async () => {}, select: () => ({ from: () => ({ where: () => ({ limit: async () => [historical] }) }) }),
    update: () => { throw new Error("history must not change"); }, insert: () => { throw new Error("no new booking"); } };
  t.mock.method(db, "transaction", (async (callback: any) => callback(tx)) as any);
  assert.equal(await createBookingFromQuote(5, "old", "old-booking-key-1234"), historical);
});
