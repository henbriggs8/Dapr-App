import assert from "node:assert/strict";
import test from "node:test";
import { bookings, bookingQuotes, services, type Booking } from "@shared/schema";

process.env.DATABASE_URL ||= "postgresql://unit:unit@127.0.0.1:1/unit_test";
const { db } = await import("./db");
const { DatabaseStorage } = await import("./storage");
const { loadBookingServiceSubtotals } = await import("./booking-compensation");

function harness(initialEarnings: number | null = null, subtotalCents: number | null = 14900) {
  let booking = { id: 133, userId: 10, serviceId: 2, providerId: 20, quoteId: "quote_test", addOnTotal: 0,
    status: "in_progress", startTime: "2026-09-21T10:00:00.000Z", endTime: null, serviceDuration: null,
    providerEarnings: initialEarnings, amount: 149, totalPrice: 1, isPaid: true, paymentStatus: "completed",
    paymentId: "pi_unchanged", priceTier: "standard", rating: 5 } as Booking;
  const writes: Record<string, unknown>[] = [];
  const locks: string[] = [];
  const reads: unknown[] = [];
  const reader = {
    select: () => ({ from: (table: unknown) => ({ where: () => {
      reads.push(table);
      const rows = table === bookings ? [{ ...booking }] : table === bookingQuotes
        ? subtotalCents == null ? [] : [{ id: "quote_test", bookingId: 133, userId: 10, serviceId: 2, subtotalCents }]
        : table === services ? [{ id: 2, price: 999 }] : [];
      const query = Object.assign(Promise.resolve(rows), {
        limit: () => query,
        for: (mode: string) => { locks.push(mode); return query; },
      });
      return query;
    } }) }),
    update: () => ({ set: (values: Record<string, unknown>) => ({ where: () => ({ returning: async () => {
      writes.push(values);
      booking = { ...booking, ...values } as Booking;
      return [{ ...booking }];
    } }) }) }),
  };
  return { reader, writes, locks, reads, current: () => booking };
}

test("subtotal batch loading reads the saved quote and cannot write payments", async () => {
  const h = harness();
  const result = await loadBookingServiceSubtotals([h.current()], h.reader as any);
  assert.equal(result.get(133), 14900);
  assert.deepEqual(h.reads, [bookingQuotes]);
  assert.equal(h.writes.length, 0);
  assert.equal(h.current().providerEarnings, null);
});

for (const method of ["timer", "status"] as const) {
  test(`${method} completion stores canonical cents once and leaves Customer payments unchanged`, async t => {
    const h = harness();
    t.mock.method(db, "transaction", async (fn: any) => fn(h.reader));
    const storage = new DatabaseStorage();
    const complete = () => method === "timer" ? storage.completeServiceTimer(133) : storage.updateBookingStatus(133, "completed");
    const first = await complete();
    assert.equal(first.providerEarnings, 9685);
    assert.equal(first.amount, 149);
    assert.equal(first.totalPrice, 1);
    assert.equal(first.paymentId, "pi_unchanged");
    const quoteReads = h.reads.filter(table => table === bookingQuotes).length;
    const second = await complete();
    assert.equal(second.providerEarnings, 9685);
    assert.equal(second.endTime, first.endTime);
    assert.equal(second.serviceDuration, first.serviceDuration);
    assert.equal(h.reads.filter(table => table === bookingQuotes).length, quoteReads);
    assert.deepEqual(h.locks, ["update", "update"]);
    for (const values of h.writes) for (const key of ["amount", "totalPrice", "paymentId", "paymentStatus", "isPaid"]) {
      assert.equal(key in values, false, `must not write ${key}`);
    }
    t.mock.method(db, "select", h.reader.select as any);
    assert.equal((await storage.getProviderEarnings(20)).totalEarnings, 9685);
  });
}

test("completion preserves existing earnings, including zero, without repricing", async t => {
  for (const cents of [0, 11000]) {
    const h = harness(cents);
    const mock = t.mock.method(db, "transaction", async (fn: any) => fn(h.reader));
    const result = await new DatabaseStorage().completeServiceTimer(133);
    assert.equal(result.providerEarnings, cents);
    assert.equal(h.reads.includes(bookingQuotes), false);
    mock.mock.restore();
  }
});

test("completion with no authoritative subtotal fails before any write", async t => {
  const h = harness(null, null);
  t.mock.method(db, "transaction", async (fn: any) => fn(h.reader));
  await assert.rejects(() => new DatabaseStorage().completeServiceTimer(133), /subtotal is unavailable/);
  assert.equal(h.writes.length, 0);
});

test("timer completion retains status/assignment gates and never backfills completed historical jobs", async t => {
  for (const scenario of ["unassigned", "cancelled", "historical"] as const) {
    const h = harness();
    if (scenario === "unassigned") h.current().providerId = null;
    if (scenario === "cancelled") h.current().status = "cancelled";
    if (scenario === "historical") {
      h.current().status = "completed";
      h.current().endTime = "2026-09-21T11:30:00.000Z";
    }
    const mock = t.mock.method(db, "transaction", async (fn: any) => fn(h.reader));
    const complete = () => new DatabaseStorage().completeServiceTimer(133);
    if (scenario === "historical") assert.equal((await complete()).providerEarnings, null);
    else await assert.rejects(complete, /not ready/);
    assert.equal(h.writes.length, 0);
    mock.mock.restore();
  }
});

for (const method of ["timer", "status"] as const) {
  test(`${method} completion replaces a duration estimate with actual elapsed minutes`, async t => {
    const h = harness(); h.current().serviceDuration = 90;
    t.mock.method(db, "transaction", async (fn: any) => fn(h.reader));
    const storage = new DatabaseStorage();
    const completed = await (method === "timer" ? storage.completeServiceTimer(133) : storage.updateBookingStatus(133, "completed"));
    assert.equal(completed.serviceDuration, Math.floor((new Date(completed.endTime!).getTime() - new Date(completed.startTime!).getTime()) / 60_000));
  });
}

test("legacy status completion without an assigned Provider preserves the existing path without inventing earnings", async t => {
  const h = harness(); h.current().providerId = null; h.current().startTime = null; h.current().status = "confirmed";
  t.mock.method(db, "transaction", async (fn: any) => fn(h.reader));
  const completed = await new DatabaseStorage().updateBookingStatus(133, "completed");
  assert.equal(completed.status, "completed"); assert.equal(completed.providerEarnings, null);
  assert.equal(completed.amount, 149); assert.equal(completed.paymentId, "pi_unchanged");
});
