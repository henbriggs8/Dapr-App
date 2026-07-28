import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPromoCode,
  calculateQuoteDiscounts,
  resolvePromoCode,
  STRIPE_MINIMUM_CARD_AMOUNT_CENTS,
} from "./promo-codes";

test("DAPR99 clamps a Basic Wash total below Stripe's minimum to zero", () => {
  const promo = resolvePromoCode(" dapR99 ");
  assert.ok(promo);

  const application = applyPromoCode(promo, 3_900);
  assert.equal(application.promoCode, "DAPR99");
  assert.equal(application.promoDiscountCents, 3_900);
  assert.equal(application.totalAmountCents, 0);
  assert.ok(
    application.totalAmountCents === 0
      || application.totalAmountCents >= STRIPE_MINIMUM_CARD_AMOUNT_CENTS,
  );
});

test("DAPR99 keeps a Refresh Detail total above Stripe's minimum", () => {
  const promo = resolvePromoCode("DAPR99");
  assert.ok(promo);

  const application = applyPromoCode(promo, 14_900);
  assert.equal(application.promoDiscountCents, 14_751);
  assert.equal(application.totalAmountCents, 149);
});

test("unknown and disabled promo codes are rejected", () => {
  assert.throws(
    () => resolvePromoCode("TEST99"),
    (error: unknown) => Boolean(
      error
      && typeof error === "object"
      && "code" in error
      && error.code === "INVALID_PROMO_CODE"
    ),
  );
});

test("a valid promo suppresses referral discount and referral credit", () => {
  const promo = resolvePromoCode("DAPR99");
  assert.ok(promo);

  const calculation = calculateQuoteDiscounts({
    subtotalCents: 14_900,
    promo,
    availableReferralDiscountCents: 2_000,
    referralCreditBalanceCents: 5_000,
    applyReferralCredits: true,
  });
  assert.equal(calculation.referralDiscountCents, 0);
  assert.equal(calculation.referralCreditAppliedCents, 0);
  assert.equal(calculation.promoApplication?.promoDiscountCents, 14_751);
  assert.equal(calculation.totalAmountCents, 149);
});

test("referral behavior remains unchanged when no promo is present", () => {
  const calculation = calculateQuoteDiscounts({
    subtotalCents: 14_900,
    promo: null,
    availableReferralDiscountCents: 2_000,
    referralCreditBalanceCents: 1_000,
    applyReferralCredits: true,
  });
  assert.equal(calculation.promoApplication, null);
  assert.equal(calculation.referralDiscountCents, 2_000);
  assert.equal(calculation.referralCreditAppliedCents, 1_000);
  assert.equal(calculation.totalAmountCents, 11_900);
});
