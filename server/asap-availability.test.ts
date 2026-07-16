import assert from "node:assert/strict";
import test from "node:test";
import { asapAvailabilityConfig, isAsapSlotCandidate, selectAsapAvailability, slotStartInstant } from "./asap-availability";

const config = {
  windowMinutes: 180,
  minLeadMinutes: 15,
  timeZone: "America/Phoenix",
  scheduleLookaheadDays: 14,
};

function slot(id: number, date: string, startTime: string, currentBookings = 0, maxBookings = 3, isAvailable = true, isPublished = true) {
  return { id, date, startTime, endTime: startTime.replace(/^(\d{2})/, value => String(Number(value) + 1).padStart(2, "0")), currentBookings, maxBookings, isAvailable, isPublished };
}

test("ASAP returns the earliest real non-full slot inside the configured window", () => {
  const now = new Date("2026-07-16T20:30:00.000Z"); // 1:30 PM in Phoenix
  const result = selectAsapAvailability([
    slot(1, "2026-07-16", "13:30"), // Too soon for the 15-minute lead time
    slot(2, "2026-07-16", "13:45", 3, 3), // Full
    slot(3, "2026-07-16", "14:00"),
    slot(4, "2026-07-16", "15:00"),
  ], now, config);
  assert.equal(result.available, true);
  if (!result.available) return;
  assert.equal(result.slot.timeSlotId, 3);
  assert.equal(result.estimatedArrivalMinutes, 30);
  assert.equal(result.etaText, "About 30–60 minutes");
});

test("ASAP returns the first real scheduled fallback after the window", () => {
  const now = new Date("2026-07-16T20:30:00.000Z");
  const result = selectAsapAvailability([
    slot(1, "2026-07-16", "14:00", 1, 1),
    slot(2, "2026-07-17", "09:00"),
    slot(3, "2026-07-17", "10:00"),
  ], now, config);
  assert.equal(result.available, false);
  if (result.available) return;
  assert.equal(result.reason, "NO_CAPACITY_IN_WINDOW");
  assert.equal(result.fallbackSlot?.timeSlotId, 2);
});

test("ASAP reports unavailable with no fallback when no explicit capacity exists", () => {
  const now = new Date("2026-07-16T20:30:00.000Z");
  const result = selectAsapAvailability([
    slot(1, "2026-07-16", "14:00", 3, 3),
    slot(2, "2026-07-17", "09:00", 0, 3, false),
  ], now, config);
  assert.equal(result.available, false);
  if (result.available) return;
  assert.equal(result.fallbackSlot, null);
});

test("ASAP quote eligibility rejects full and out-of-window slots", () => {
  const now = new Date("2026-07-16T20:30:00.000Z");
  assert.equal(isAsapSlotCandidate(slot(1, "2026-07-16", "14:00"), now, config), true);
  assert.equal(isAsapSlotCandidate(slot(2, "2026-07-16", "14:00", 3, 3), now, config), false);
  assert.equal(isAsapSlotCandidate(slot(3, "2026-07-17", "09:00"), now, config), false);
  assert.equal(isAsapSlotCandidate(slot(4, "2026-07-16", "14:00", 0, 3, true, false), now, config), false);
});

test("Phoenix slot dates are converted to real instants", () => {
  assert.equal(slotStartInstant({ date: "2026-07-16", startTime: "14:00" }, "America/Phoenix").toISOString(), "2026-07-16T21:00:00.000Z");
});

test("ASAP config defaults are explicit and configurable", () => {
  assert.deepEqual(asapAvailabilityConfig({}), config);
  assert.deepEqual(asapAvailabilityConfig({
    DAPR_ASAP_WINDOW_MINUTES: "120",
    DAPR_ASAP_MIN_LEAD_MINUTES: "20",
    DAPR_SERVICE_TIME_ZONE: "UTC",
    DAPR_SCHEDULE_LOOKAHEAD_DAYS: "7",
  }), { windowMinutes: 120, minLeadMinutes: 20, timeZone: "UTC", scheduleLookaheadDays: 7 });
});
