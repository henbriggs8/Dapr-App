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
  assert.equal(isAllowedProviderStatusTransition("confirmed", "in_progress"), true);
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
    serviceLocation: "Service area",
    date: "2026-07-24",
    time: "ASAP",
    totalPrice: 285,
    serviceDuration: 180,
    notes: "Gate code on arrival",
    userId: 10,
    vehicleId: 44,
    paymentId: "pi_private",
    stripeSessionId: "cs_private",
    paymentStatus: "completed",
  } as any, {
    customerFirstName: "Taylor",
    vehicleLabel: "2024 Honda Civic",
    distance: 2.4,
  });

  assert.deepEqual(Object.keys(job).sort(), [
    "customerFirstName",
    "date",
    "distance",
    "id",
    "notes",
    "serviceDuration",
    "serviceId",
    "serviceLocation",
    "time",
    "totalPrice",
    "vehicleLabel",
  ]);
});
