import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessBookingTracking,
  canMutateAssignedBooking,
  isAllowedProviderStage,
  isAllowedProviderStatusTransition,
  unknownAddOnIds,
} from "./booking-route-safety";

const booking = { userId: 10, providerId: 20, status: "confirmed" };
const customer = { id: 10, isProvider: false, isAdmin: false };
const assignedProvider = { id: 20, isProvider: true, isAdmin: false };
const otherProvider = { id: 21, isProvider: true, isAdmin: false };
const admin = { id: 99, isProvider: false, isAdmin: true };

test("tracking is limited to the customer, assigned provider, or admin", () => {
  assert.equal(canAccessBookingTracking(customer, booking), true);
  assert.equal(canAccessBookingTracking(assignedProvider, booking), true);
  assert.equal(canAccessBookingTracking(admin, booking), true);
  assert.equal(canAccessBookingTracking(otherProvider, booking), false);
});

test("provider mutations require assignment unless the actor is an admin", () => {
  assert.equal(canMutateAssignedBooking(assignedProvider, booking), true);
  assert.equal(canMutateAssignedBooking(admin, booking), true);
  assert.equal(canMutateAssignedBooking(otherProvider, booking), false);
  assert.equal(canMutateAssignedBooking(customer, booking), false);
});

test("provider status and stage values are allowlisted", () => {
  assert.equal(isAllowedProviderStatusTransition("confirmed", "in_progress"), true);
  assert.equal(isAllowedProviderStatusTransition("confirmed", "completed"), false);
  assert.equal(isAllowedProviderStage("quality_check"), true);
  assert.equal(isAllowedProviderStage("drop_table"), false);
});

test("unknown add-on ids are rejected deterministically", () => {
  assert.deepEqual(unknownAddOnIds(["pet-hair", "bogus", "bogus"], new Set(["pet-hair"])), ["bogus"]);
});
