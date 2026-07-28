import { NativeContractError } from "./native-contract-error";

export const STRIPE_MINIMUM_CARD_AMOUNT_CENTS = 50;

export interface PromoCodeDefinition {
  code: string;
  discountType: "percent";
  percentOff: number;
  enabled: boolean;
  label: string;
}

export interface PromoCodeApplication {
  promoCode: string;
  promoDiscountCents: number;
  promoDiscountLabel: string;
  discountMessage: string;
  totalAmountCents: number;
}

export interface QuoteDiscountCalculation {
  promoApplication: PromoCodeApplication | null;
  referralDiscountCents: number;
  referralCreditAppliedCents: number;
  totalAmountCents: number;
}

// Temporary MVP testing promo. Remove or disable it after promo checkout validation.
const PROMO_CODES: Readonly<Record<string, PromoCodeDefinition>> = {
  DAPR99: {
    code: "DAPR99",
    discountType: "percent",
    percentOff: 99,
    enabled: true,
    label: "DAPR99 promo",
  },
};

export function resolvePromoCode(rawCode?: string | null): PromoCodeDefinition | null {
  if (rawCode == null) return null;
  const normalizedCode = rawCode.trim().toUpperCase();
  const promo = PROMO_CODES[normalizedCode];
  if (!promo?.enabled) {
    throw new NativeContractError(400, "INVALID_PROMO_CODE", "That code isn’t valid.");
  }
  return promo;
}

export function applyPromoCode(promo: PromoCodeDefinition, subtotalCents: number): PromoCodeApplication {
  const percentDiscountCents = Math.floor((subtotalCents * promo.percentOff) / 100);
  const discountedTotalCents = Math.max(0, subtotalCents - percentDiscountCents);
  const totalAmountCents = discountedTotalCents > 0 && discountedTotalCents < STRIPE_MINIMUM_CARD_AMOUNT_CENTS
    ? 0
    : discountedTotalCents;
  const promoDiscountCents = subtotalCents - totalAmountCents;

  return {
    promoCode: promo.code,
    promoDiscountCents,
    promoDiscountLabel: promo.label,
    discountMessage: "Promo code applied. Referral discounts and credits are not combined with promo codes.",
    totalAmountCents,
  };
}

export function calculateQuoteDiscounts(input: {
  subtotalCents: number;
  promo: PromoCodeDefinition | null;
  availableReferralDiscountCents: number;
  referralCreditBalanceCents: number;
  applyReferralCredits: boolean;
}): QuoteDiscountCalculation {
  if (input.promo) {
    const promoApplication = applyPromoCode(input.promo, input.subtotalCents);
    return {
      promoApplication,
      referralDiscountCents: 0,
      referralCreditAppliedCents: 0,
      totalAmountCents: promoApplication.totalAmountCents,
    };
  }

  const referralDiscountCents = Math.min(
    input.availableReferralDiscountCents,
    input.subtotalCents,
  );
  const afterDiscountCents = input.subtotalCents - referralDiscountCents;
  const referralCreditAppliedCents = input.applyReferralCredits
    ? Math.min(input.referralCreditBalanceCents, afterDiscountCents)
    : 0;
  return {
    promoApplication: null,
    referralDiscountCents,
    referralCreditAppliedCents,
    totalAmountCents: afterDiscountCents - referralCreditAppliedCents,
  };
}
