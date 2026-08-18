import assert from "node:assert/strict";
import test from "node:test";
import { evaluateProviderEligibility } from "./provider-eligibility";

const now = new Date("2026-08-18T00:10:00.000Z");
const active = { isProvider: true, currentStatus: "online", applicationStatus: "active_provider", lastHeartbeatAt: "2026-08-18T00:09:00.000Z" };

test("active online provider with fresh presence is eligible", () => {
  assert.deepEqual(evaluateProviderEligibility(active, { now, ttlMs: 120_000 }), { eligible: true, code: "ELIGIBLE" });
});

test("provider approval, online state, and fresh presence are independent gates", () => {
  assert.equal(evaluateProviderEligibility({ ...active, applicationStatus: "approved_needs_setup" }, { now }).code, "PROVIDER_NOT_ACTIVE");
  assert.equal(evaluateProviderEligibility({ ...active, currentStatus: "offline" }, { now }).code, "PROVIDER_OFFLINE");
  assert.equal(evaluateProviderEligibility({ ...active, lastHeartbeatAt: "2026-08-18T00:00:00.000Z" }, { now, ttlMs: 120_000 }).code, "PROVIDER_PRESENCE_STALE");
});

test("registration eligibility does not require online presence", () => {
  assert.equal(evaluateProviderEligibility({ ...active, currentStatus: "offline", lastHeartbeatAt: null }, { requireOnline: false }).eligible, true);
});
