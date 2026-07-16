import assert from "node:assert/strict";
import test from "node:test";
import { buildCapacitySlotWindows, publishCapacityRequestSchema, unpublishCapacityRequestSchema } from "./time-slot-capacity";

test("capacity publication creates exact contiguous slot windows", () => {
  const input = publishCapacityRequestSchema.parse({
    date: "2026-07-16",
    startTime: "09:00",
    endTime: "16:00",
    slotDurationMinutes: 60,
    maxBookings: 2,
  });
  const windows = buildCapacitySlotWindows(input);
  assert.equal(windows.length, 7);
  assert.deepEqual(windows[0], { date: "2026-07-16", startTime: "09:00", endTime: "10:00" });
  assert.deepEqual(windows[6], { date: "2026-07-16", startTime: "15:00", endTime: "16:00" });
});

test("capacity window validation rejects invalid dates, times, and partial slots", () => {
  assert.equal(publishCapacityRequestSchema.safeParse({
    date: "2026-02-30", startTime: "09:00", endTime: "16:00", slotDurationMinutes: 60, maxBookings: 2,
  }).success, false);
  assert.equal(publishCapacityRequestSchema.safeParse({
    date: "2026-07-16", startTime: "16:00", endTime: "09:00", slotDurationMinutes: 60, maxBookings: 2,
  }).success, false);
  assert.equal(publishCapacityRequestSchema.safeParse({
    date: "2026-07-16", startTime: "09:00", endTime: "10:30", slotDurationMinutes: 60, maxBookings: 2,
  }).success, false);
  assert.equal(publishCapacityRequestSchema.safeParse({
    date: "2026-07-16", startTime: "09:00", endTime: "10:00", slotDurationMinutes: 60, maxBookings: 0,
  }).success, false);
});

test("unpublish accepts the same precise window without a capacity value", () => {
  const parsed = unpublishCapacityRequestSchema.parse({
    date: "2026-07-16",
    startTime: "09:00",
    endTime: "11:00",
    slotDurationMinutes: 60,
  });
  assert.equal(buildCapacitySlotWindows(parsed).length, 2);
});
