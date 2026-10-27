import type { Booking, BookingQuote, Service } from "@shared/schema";

export const MARKETPLACE_COMPENSATION_POLICY = Object.freeze({
  version: "marketplace-65-35-v1",
  providerBasisPoints: 6500,
});

// Add a funding variant and its explicit allocation rule here when approved.
// Unsupported funding must never silently become a platform subsidy.
export type CompensationDiscount = { funding: "platform"; amountCents: number };

function validCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function calculateProviderCompensation(input: {
  serviceSubtotalCents: number;
  discount?: CompensationDiscount;
}) {
  const { serviceSubtotalCents, discount } = input;
  if (!validCents(serviceSubtotalCents)) throw new Error("Invalid service subtotal cents");
  if (discount && discount.funding !== "platform") throw new Error("Unsupported discount funding");
  const platformDiscountCents = discount?.amountCents ?? 0;
  if (!validCents(platformDiscountCents) || platformDiscountCents > serviceSubtotalCents) {
    throw new Error("Invalid platform discount cents");
  }
  // Exact integer arithmetic, rounding half a cent up. Dapr receives the remainder.
  const providerPayoutCents = Number(
    (BigInt(serviceSubtotalCents) * BigInt(MARKETPLACE_COMPENSATION_POLICY.providerBasisPoints)
      + BigInt(5000)) / BigInt(10000),
  );
  const platformShareCents = serviceSubtotalCents - providerPayoutCents;
  return {
    policyVersion: MARKETPLACE_COMPENSATION_POLICY.version,
    serviceSubtotalCents,
    providerPayoutCents,
    platformShareCents,
    platformDiscountCents,
    // This can be negative for a subsidized promotion; it is not gross commission.
    platformNetCents: platformShareCents - platformDiscountCents,
  };
}

export function resolveProviderCompensation(
  booking: Pick<Booking, "providerEarnings">,
  serviceSubtotalCents?: number | null,
): { payoutCents: number | null; source: "persisted" | "estimated" | "unavailable" } {
  if (booking.providerEarnings != null) {
    return validCents(booking.providerEarnings)
      ? { payoutCents: booking.providerEarnings, source: "persisted" }
      : { payoutCents: null, source: "unavailable" };
  }
  return validCents(serviceSubtotalCents)
    ? { payoutCents: calculateProviderCompensation({ serviceSubtotalCents }).providerPayoutCents, source: "estimated" }
    : { payoutCents: null, source: "unavailable" };
}

export function providerPayoutCents(booking: Pick<Booking, "providerEarnings">, serviceSubtotalCents?: number | null) {
  return resolveProviderCompensation(booking, serviceSubtotalCents).payoutCents;
}

export type CompensationBooking = Pick<Booking, "id" | "userId" | "serviceId" | "quoteId" | "addOnTotal">;
export type CompensationQuote = Pick<BookingQuote, "id" | "userId" | "serviceId" | "bookingId" | "subtotalCents">;

export function resolveServiceSubtotalCents(
  booking: CompensationBooking,
  quote: CompensationQuote | null | undefined,
  service: Pick<Service, "id" | "price"> | null | undefined,
): number | null {
  if (booking.quoteId) {
    // The accepted quote is a price snapshot. Never replace a missing/broken
    // quote with today's catalog or with the discounted customer charge.
    if (!quote || quote.id !== booking.quoteId || quote.userId !== booking.userId
      || quote.serviceId !== booking.serviceId || (quote.bookingId != null && quote.bookingId !== booking.id)) return null;
    return validCents(quote.subtotalCents) ? quote.subtotalCents : null;
  }
  // Older bookings have no quote snapshot. Their supported estimate uses the
  // catalog service plus saved add-on dollars; amount/totalPrice are not inputs.
  const addOnDollars = booking.addOnTotal ?? 0;
  if (!service || service.id !== booking.serviceId || !validCents(service.price) || !validCents(addOnDollars)) return null;
  const subtotalCents = (service.price + addOnDollars) * 100;
  return validCents(subtotalCents) ? subtotalCents : null;
}
