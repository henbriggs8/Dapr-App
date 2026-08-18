import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessBookingTracking,
  canMutateAssignedBooking,
  isAllowedProviderStage,
  isAllowedProviderStatusTransition,
  serializeAvailableJob,
  serializePublicProvider,
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
  assert.equal(isAllowedProviderStatusTransition("confirmed", "in_progress"), false);
  assert.equal(isAllowedProviderStatusTransition("on_the_way", "arrived"), true);
  assert.equal(isAllowedProviderStatusTransition("arrived", "in_progress"), true);
  assert.equal(isAllowedProviderStatusTransition("confirmed", "completed"), false);
  assert.equal(isAllowedProviderStage("quality_check"), true);
  assert.equal(isAllowedProviderStage("drop_table"), false);
});

test("unknown add-on ids are rejected deterministically", () => {
  assert.deepEqual(unknownAddOnIds(["pet-hair", "bogus", "bogus"], new Set(["pet-hair"])), ["bogus"]);
});

test("public provider profiles omit private account fields", () => {
  const profile = serializePublicProvider({
    id: 20,
    name: "Provider",
    description: "Mobile detailer",
    profileImage: null,
    rating: 5,
    ratingCount: 12,
    currentStatus: "online",
    email: "private@example.com",
    phone: "555-0100",
    password: "hash",
    stripeCustomerId: "cus_private",
    pushToken: "private-token",
  } as any);

  assert.deepEqual(Object.keys(profile).sort(), [
    "currentStatus",
    "description",
    "id",
    "name",
    "profileImage",
    "rating",
    "ratingCount",
  ]);
});

test("available jobs expose only the provider offer contract", () => {
  const job = serializeAvailableJob({
    id: 31,
    serviceId: 4,
    serviceLocationType: "home",
    date: "2026-07-24",
    time: "ASAP",
    fulfillmentMode: "asap",
    providerEarnings: 15000,
    serviceDuration: 180,
  } as any, {
    serviceName: "Premium detail",
    vehicleSummary: "2024 Honda Civic",
    distanceMiles: 2.4,
  });

  assert.deepEqual(Object.keys(job).sort(), [
    "date",
    "distanceMiles",
    "estimatedDurationMinutes",
    "fulfillmentMode",
    "id",
    "payoutCents",
    "serviceArea",
    "serviceId",
    "serviceName",
    "time",
    "vehicleSummary",
  ]);
});
