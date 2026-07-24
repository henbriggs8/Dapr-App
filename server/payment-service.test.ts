import assert from "node:assert/strict";
import test from "node:test";

process.env.STRIPE_SECRET_KEY ||= "sk_test_unit_test_only";
const {
  isMissingStripeCustomerError,
  nativePaymentIntentDisposition,
  validateNativePaymentIntent,
} = await import("./payment-service");

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

test("classifies succeeded native intents as paid instead of creating another intent", () => {
  assert.equal(nativePaymentIntentDisposition({ status: "succeeded", client_secret: "pi_secret" }), "paid");
});

test("reuses an unresolved native intent with a client secret", () => {
  assert.equal(nativePaymentIntentDisposition({ status: "requires_payment_method", client_secret: "pi_secret" }), "reusable");
  assert.equal(nativePaymentIntentDisposition({ status: "processing", client_secret: "pi_secret" }), "reusable");
});

test("closes canceled native intents and blocks unavailable replacements", () => {
  assert.equal(nativePaymentIntentDisposition({ status: "canceled", client_secret: "pi_secret" }), "closed");
  assert.equal(nativePaymentIntentDisposition({ status: "processing", client_secret: null }), "unavailable");
});

const expectedNativeIntent = {
  paymentIntentId: "pi_expected",
  bookingId: 42,
  amountCents: 3900,
  currency: "usd",
  customerId: "cus_expected",
};

const validNativeIntent = {
  id: "pi_expected",
  amount: 3900,
  currency: "usd",
  customer: "cus_expected",
  metadata: { bookingId: "42", contract: "native_payment_sheet_v1" },
};

test("validates the stored native intent identity, amount, currency, booking, contract, and customer", () => {
  assert.deepEqual(validateNativePaymentIntent(validNativeIntent, expectedNativeIntent), {
    valid: true,
    issues: [],
  });
});

test("rejects a succeeded intent when booking-bound fields do not match", () => {
  const result = validateNativePaymentIntent({
    ...validNativeIntent,
    id: "pi_other",
    amount: 4900,
    currency: "eur",
    customer: "cus_other",
    metadata: { bookingId: "99", contract: "other_contract" },
  }, expectedNativeIntent);

  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, [
    "intent_id_mismatch",
    "amount_mismatch",
    "currency_mismatch",
    "booking_metadata_mismatch",
    "contract_metadata_mismatch",
    "customer_mismatch",
  ]);
});
