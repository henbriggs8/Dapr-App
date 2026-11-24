import assert from "node:assert/strict";
import test from "node:test";
import { liveProviderAvailability } from "./asap-availability";

test("ASAP is available when at least one eligible provider is online", () => {
  assert.deepEqual(liveProviderAvailability(1), {
    available: true,
    mode: "asap",
    etaText: "About 15–30 minutes",
    reason: null,
    onlineProviderCount: 1,
  });
});

test("ASAP stays bookable without promising an ETA when live supply is empty", () => {
  assert.deepEqual(liveProviderAvailability(0), {
    available: true,
    mode: "asap",
    etaText: "Next available Dapr Pro — arrival time confirmed after matching",
    reason: null,
    onlineProviderCount: 0,
  });
});

test("ASAP reports the full online provider count without applying a queue limit", () => {
  const result = liveProviderAvailability(3);
  assert.equal(result.available, true);
  assert.equal(result.onlineProviderCount, 3);
});
