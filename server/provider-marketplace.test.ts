import assert from "node:assert/strict";
import test from "node:test";
import { providerHasPassed } from "./provider-marketplace";

test("passes are scoped to the provider and survive duplicate retries", () => {
  assert.equal(providerHasPassed([7, 9, 9], 9), true);
  assert.equal(providerHasPassed([7, 9], 10), false);
  assert.equal(providerHasPassed(null, 9), false);
});
