import assert from "node:assert/strict";
import test from "node:test";

process.env.STRIPE_SECRET_KEY ||= "sk_test_unit_test_only";
const { isMissingStripeCustomerError } = await import("./payment-service");

test("recognizes Stripe's missing customer error", () => {
  assert.equal(isMissingStripeCustomerError({
    code: "resource_missing",
    param: "customer",
    message: "No such customer: 'cus_stale'",
  }), true);
});

test("does not recover unrelated Stripe resource errors", () => {
  assert.equal(isMissingStripeCustomerError({
    code: "resource_missing",
    param: "payment_method",
    message: "No such PaymentMethod: 'pm_missing'",
  }), false);
});

test("does not recover card or transport failures", () => {
  assert.equal(isMissingStripeCustomerError({ code: "card_declined", param: "customer" }), false);
  assert.equal(isMissingStripeCustomerError(new Error("Connection interrupted")), false);
});
