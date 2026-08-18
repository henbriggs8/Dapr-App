import assert from "node:assert/strict";
import test from "node:test";
import { serializeAvailableJob } from "./booking-route-safety";

test("available-job DTO is an explicit pre-acceptance projection", () => {
  const result = serializeAvailableJob({
    id: 10,
    serviceId: 2,
    serviceLocationType: "home",
    date: "2026-08-20",
    time: "09:00",
    fulfillmentMode: "scheduled",
    providerEarnings: 6500,
    serviceDuration: 90,
  }, { serviceName: "Premium detail", vehicleSummary: "2024 Honda Civic", distanceMiles: 3.2 });
  assert.deepEqual(Object.keys(result).sort(), [
    "date", "distanceMiles", "estimatedDurationMinutes", "fulfillmentMode", "id", "payoutCents",
    "serviceArea", "serviceId", "serviceName", "time", "vehicleSummary",
  ].sort());
  for (const forbidden of ["serviceLocation", "notes", "customerFirstName", "userId", "paymentId", "totalPrice"]) {
    assert.equal(forbidden in result, false);
  }
});
