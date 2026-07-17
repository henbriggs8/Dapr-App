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

test("ASAP reports NO_ONLINE_PROVIDERS when live supply is empty", () => {
  assert.deepEqual(liveProviderAvailability(0), {
    available: false,
    mode: "asap",
    etaText: null,
    reason: "NO_ONLINE_PROVIDERS",
    onlineProviderCount: 0,
  });
});

test("ASAP reports the full online provider count without applying a queue limit", () => {
  const result = liveProviderAvailability(3);
  assert.equal(result.available, true);
  assert.equal(result.onlineProviderCount, 3);
});
