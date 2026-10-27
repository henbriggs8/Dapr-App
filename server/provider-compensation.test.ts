import assert from "node:assert/strict";
import test from "node:test";
import { calculateProviderCompensation, resolveProviderCompensation, resolveServiceSubtotalCents } from "./provider-compensation";
import { applyPromoCode, resolvePromoCode } from "./promo-codes";
import { serializeAssignedProviderJob } from "./booking-route-safety";

const booking = { id: 133, userId: 10, serviceId: 2, quoteId: "quote_test", addOnTotal: 0 };
const quote = { id: "quote_test", userId: 10, serviceId: 2, bookingId: 133, subtotalCents: 14_900 };

test("149-dollar service has a 96.85 provider share and 52.15 Dapr share", () => {
  const result = calculateProviderCompensation({ serviceSubtotalCents: 14_900 });
  assert.equal(result.providerPayoutCents, 9685);
  assert.equal(result.platformShareCents, 5215);
  assert.equal(result.platformNetCents, 5215);
  assert.equal(result.policyVersion, "marketplace-65-35-v1");
});

test("DAPR99 affects platform net proceeds but never reduces provider compensation", () => {
  const promo = applyPromoCode(resolvePromoCode("DAPR99")!, 14_900);
  const result = calculateProviderCompensation({ serviceSubtotalCents: 14_900,
    discount: { funding: "platform", amountCents: promo.promoDiscountCents } });
  assert.equal(promo.totalAmountCents, 149);
  assert.equal(result.providerPayoutCents, 9685);
  assert.equal(result.platformShareCents, 5215);
  assert.equal(result.platformNetCents, -9536);
  assert.equal(result.providerPayoutCents + result.platformNetCents, promo.totalAmountCents);
});

test("a fully platform-funded discount also leaves provider compensation intact", () => {
  assert.equal(calculateProviderCompensation({ serviceSubtotalCents: 14900,
    discount: { funding: "platform", amountCents: 14900 } }).providerPayoutCents, 9685);
});

test("cent rounding is deterministic, half-up, and preserves the complete subtotal", () => {
  for (const subtotal of [0, 1, 10, 11, 14901, Number.MAX_SAFE_INTEGER]) {
    const result = calculateProviderCompensation({ serviceSubtotalCents: subtotal });
    assert.equal(result.providerPayoutCents + result.platformShareCents, subtotal);
  }
  assert.equal(calculateProviderCompensation({ serviceSubtotalCents: 10 }).providerPayoutCents, 7);
});

test("invalid cents and unsupported discount funding are rejected", () => {
  for (const invalid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateProviderCompensation({ serviceSubtotalCents: invalid }));
  }
  assert.throws(() => calculateProviderCompensation({ serviceSubtotalCents: 100,
    discount: { funding: "provider", amountCents: 10 } as any }), /Unsupported/);
  assert.throws(() => calculateProviderCompensation({ serviceSubtotalCents: 100,
    discount: { funding: "platform", amountCents: 101 } }));
});

test("the bound quote snapshot wins over changed catalog and discounted payment fields", () => {
  const paidBooking = { ...booking, amount: 149, totalPrice: 1 };
  const subtotal = resolveServiceSubtotalCents(paidBooking, quote, { id: 2, price: 999 });
  assert.equal(subtotal, 14900);
  assert.equal(resolveProviderCompensation({ providerEarnings: null }, subtotal).payoutCents, 9685);
});

test("missing or mismatched native quotes never fall back to catalog or customer payment", () => {
  for (const invalid of [null, { ...quote, id: "wrong" }, { ...quote, userId: 99 },
    { ...quote, serviceId: 99 }, { ...quote, bookingId: 134 }, { ...quote, subtotalCents: -1 }]) {
    assert.equal(resolveServiceSubtotalCents(booking, invalid, { id: 2, price: 149 }), null);
  }
});

test("legacy bookings use catalog plus saved add-ons, excluding customer payment", () => {
  const legacy = { ...booking, quoteId: null, addOnTotal: 20, amount: 149, totalPrice: 1 };
  assert.equal(resolveServiceSubtotalCents(legacy, null, { id: 2, price: 149 }), 16900);
  assert.equal(resolveServiceSubtotalCents(legacy, null, null), null);
});

test("persisted earnings including zero stay distinct from estimates", () => {
  assert.deepEqual(resolveProviderCompensation({ providerEarnings: null }, 14900), { payoutCents: 9685, source: "estimated" });
  for (const cents of [0, 10000]) assert.deepEqual(resolveProviderCompensation({ providerEarnings: cents }, 14900), { payoutCents: cents, source: "persisted" });
  assert.deepEqual(resolveProviderCompensation({ providerEarnings: null }, null), { payoutCents: null, source: "unavailable" });
});

test("accepted-job estimate uses the same policy without masquerading as finalized earnings", () => {
  const result = serializeAssignedProviderJob({ ...booking, providerEarnings: null, amount: 149, totalPrice: 1 } as any,
    { customerFirstName: "Test", vehicleLabel: "Jeep", serviceSubtotalCents: 14900 });
  assert.equal(result.payoutCents, 9685);
  assert.equal(result.providerEarnings, null);
});
