import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { ADD_ONS_BY_ID, resolveBookingAddOns } from "@shared/add-ons";
import { bookingQuotes, bookings, referrals, services, timeSlots, users, vehicles, type Booking } from "@shared/schema";
import { db } from "./db";
import { NativeContractError } from "./native-contract-error";
import { getEligibleOnlineProviderCount } from "./asap-availability";

export { NativeContractError } from "./native-contract-error";

const QUOTE_TTL_MS = 15 * 60 * 1000;
const PAYMENT_TTL_MS = 30 * 60 * 1000;
const REFERRAL_DISCOUNT_CENTS = 2_000;

const nativeQuoteCommonSchema = z.object({
  serviceId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  serviceLocation: z.string().trim().min(1),
  serviceLocationType: z.enum(["home", "work", "other"]),
  serviceLatitude: z.number().finite().nullable().optional(),
  serviceLongitude: z.number().finite().nullable().optional(),
  addOnIds: z.array(z.string()).default([]),
  applyReferralCredits: z.boolean().default(true),
});

export const nativeQuoteRequestSchema = z.discriminatedUnion("fulfillmentMode", [
  nativeQuoteCommonSchema.extend({
    fulfillmentMode: z.literal("asap"),
    timeSlotId: z.null().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().trim().min(1).optional(),
  }),
  nativeQuoteCommonSchema.extend({
    fulfillmentMode: z.literal("scheduled"),
    timeSlotId: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().trim().min(1),
  }),
]);

export type NativeQuoteRequest = z.infer<typeof nativeQuoteRequestSchema>;

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function bookingReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "DAPR-";
  for (let i = 0; i < 6; i++) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

function dateInPhoenix(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function serializeQuote(quote: typeof bookingQuotes.$inferSelect) {
  return {
    quoteId: quote.id,
    serviceId: quote.serviceId,
    timeSlotId: quote.timeSlotId,
    vehicleId: quote.vehicleId,
    addOns: quote.addOns,
    subtotalCents: quote.subtotalCents,
    referralDiscountCents: quote.referralDiscountCents,
    referralCreditAppliedCents: quote.referralCreditAppliedCents,
    feesCents: 0,
    taxesCents: 0,
    totalAmountCents: quote.totalAmountCents,
    currency: "usd",
    expiresAt: quote.expiresAt,
    fulfillmentMode: quote.fulfillmentMode,
  };
}

export async function createNativeQuote(userId: number, idempotencyKey: string, raw: unknown) {
  const input = nativeQuoteRequestSchema.parse(raw);
  const requestFingerprint = fingerprint(input);
  const [existing] = await db.select().from(bookingQuotes).where(and(
    eq(bookingQuotes.userId, userId),
    eq(bookingQuotes.idempotencyKey, idempotencyKey),
  )).limit(1);
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new NativeContractError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different quote request.");
    }
    return existing;
  }

  const [service] = await db.select().from(services).where(eq(services.id, input.serviceId)).limit(1);
  if (!service) throw new NativeContractError(400, "INVALID_SERVICE", "Service not found.");
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).limit(1);
  if (!vehicle || vehicle.userId !== userId) throw new NativeContractError(403, "VEHICLE_ACCESS_DENIED", "Vehicle does not belong to this account.");
  let timeSlotId: number | null = null;
  let quoteDate: string;
  let quoteTime: string;
  if (input.fulfillmentMode === "scheduled") {
    const [slot] = await db.select().from(timeSlots).where(eq(timeSlots.id, input.timeSlotId)).limit(1);
    if (!slot || !slot.isPublished || !slot.isAvailable || slot.currentBookings >= slot.maxBookings) {
      throw new NativeContractError(409, "TIME_SLOT_UNAVAILABLE", "The selected published time slot is no longer available.");
    }
    if (slot.date !== input.date) throw new NativeContractError(400, "SLOT_DATE_MISMATCH", "The selected time slot does not match the booking date.");
    if (slot.startTime !== input.time) throw new NativeContractError(400, "SLOT_TIME_MISMATCH", "The selected time slot does not match the booking time.");
    timeSlotId = input.timeSlotId;
    quoteDate = input.date;
    quoteTime = input.time;
  } else {
    if (await getEligibleOnlineProviderCount(db) < 1) {
      throw new NativeContractError(409, "NO_ONLINE_PROVIDERS", "No online Dapr Pros are currently available.");
    }
    timeSlotId = null;
    quoteDate = dateInPhoenix(new Date());
    quoteTime = "ASAP";
  }

  const uniqueAddOnIds = input.addOnIds.filter((id, index, ids) => ids.indexOf(id) === index);
  const invalidAddOnIds = uniqueAddOnIds.filter(id => !ADD_ONS_BY_ID[id]);
  if (invalidAddOnIds.length) throw new NativeContractError(400, "INVALID_ADD_ON", `Unknown add-on IDs: ${invalidAddOnIds.join(", ")}`);
  const resolved = resolveBookingAddOns(uniqueAddOnIds);
  const subtotalCents = Math.round((service.price + resolved.addOnTotal) * 100);

  const [priorPaid] = await db.select({ id: bookings.id }).from(bookings).where(and(
    eq(bookings.userId, userId), eq(bookings.isPaid, true),
  )).limit(1);
  const [availableReferral] = priorPaid ? [] : await db.select({ id: referrals.id }).from(referrals).where(and(
    eq(referrals.referredUserId, userId), eq(referrals.discountStatus, "available"),
  )).limit(1);
  const referralDiscountCents = availableReferral ? Math.min(REFERRAL_DISCOUNT_CENTS, subtotalCents) : 0;
  const [user] = await db.select({ credit: users.referralCreditBalanceCents }).from(users).where(eq(users.id, userId)).limit(1);
  const afterDiscount = subtotalCents - referralDiscountCents;
  const referralCreditAppliedCents = input.applyReferralCredits ? Math.min(user?.credit ?? 0, afterDiscount) : 0;
  const totalAmountCents = afterDiscount - referralCreditAppliedCents;
  const now = new Date();
  const [quote] = await db.insert(bookingQuotes).values({
    id: randomUUID(), userId, idempotencyKey, requestFingerprint,
    serviceId: input.serviceId, timeSlotId, vehicleId: input.vehicleId,
    serviceLocation: input.serviceLocation, serviceLocationType: input.serviceLocationType,
    serviceLatitude: input.serviceLatitude ?? null, serviceLongitude: input.serviceLongitude ?? null,
    date: quoteDate, time: quoteTime, priceTier: service.category,
    addOnIds: uniqueAddOnIds, addOns: resolved.addOns,
    subtotalCents, referralDiscountCents, referralCreditAppliedCents, totalAmountCents,
    fulfillmentMode: input.fulfillmentMode,
    createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
  }).returning();
  return quote;
}

export async function createBookingFromQuote(userId: number, quoteId: string, idempotencyKey: string): Promise<Booking> {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(${userId})`);
    const [existing] = await tx.select().from(bookings).where(eq(bookings.bookingIdempotencyKey, idempotencyKey)).limit(1);
    if (existing) {
      if (existing.quoteId !== quoteId || existing.userId !== userId) throw new NativeContractError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was used for another booking.");
      return existing;
    }
    const [quote] = await tx.select().from(bookingQuotes).where(and(eq(bookingQuotes.id, quoteId), eq(bookingQuotes.userId, userId))).limit(1);
    if (!quote) throw new NativeContractError(404, "QUOTE_NOT_FOUND", "Quote not found.");
    if (quote.bookingId) {
      const [booking] = await tx.select().from(bookings).where(eq(bookings.id, quote.bookingId)).limit(1);
      if (booking) return booking;
    }
    if (new Date(quote.expiresAt).getTime() <= Date.now()) throw new NativeContractError(410, "QUOTE_EXPIRED", "Quote has expired.");

    const now = new Date();
    let slotReservedAt: string | null = null;
    if (quote.fulfillmentMode === "scheduled") {
      if (quote.timeSlotId == null) throw new NativeContractError(409, "TIME_SLOT_UNAVAILABLE", "The scheduled quote has no time slot.");
      // Scheduled capacity remains atomic. PostgreSQL rechecks the conditions
      // after a competing transaction releases the row lock.
      const [slot] = await tx.update(timeSlots).set({
        currentBookings: sql`${timeSlots.currentBookings} + 1`,
      }).where(and(
        eq(timeSlots.id, quote.timeSlotId),
        eq(timeSlots.isPublished, true),
        eq(timeSlots.isAvailable, true),
        lt(timeSlots.currentBookings, timeSlots.maxBookings),
      )).returning();
      if (!slot) throw new NativeContractError(409, "TIME_SLOT_UNAVAILABLE", "The selected time slot is no longer available.");
      slotReservedAt = now.toISOString();
    }
    const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, quote.vehicleId)).limit(1);
    if (!vehicle || vehicle.userId !== userId) throw new NativeContractError(403, "VEHICLE_ACCESS_DENIED", "Vehicle does not belong to this account.");

    if (quote.referralDiscountCents > 0) {
      const [claimed] = await tx.update(referrals).set({ discountStatus: "applied" }).where(and(
        eq(referrals.referredUserId, userId), eq(referrals.discountStatus, "available"),
      )).returning();
      if (!claimed) throw new NativeContractError(409, "QUOTE_STALE", "Referral eligibility changed; request a new quote.");
    }
    if (quote.referralCreditAppliedCents > 0) {
      const [debited] = await tx.update(users).set({
        referralCreditBalanceCents: sql`${users.referralCreditBalanceCents} - ${quote.referralCreditAppliedCents}`,
      }).where(and(eq(users.id, userId), gt(users.referralCreditBalanceCents, quote.referralCreditAppliedCents - 1))).returning();
      if (!debited) throw new NativeContractError(409, "QUOTE_STALE", "Referral credit balance changed; request a new quote.");
    }

    const [booking] = await tx.insert(bookings).values({
      userId, providerId: null, serviceId: quote.serviceId, timeSlotId: quote.timeSlotId, vehicleId: quote.vehicleId,
      bookingRef: bookingReference(), status: "awaiting_payment", priceTier: quote.priceTier,
      timestamp: now.toISOString(), serviceLocation: quote.serviceLocation, serviceLocationType: quote.serviceLocationType,
      serviceLatitude: quote.serviceLatitude, serviceLongitude: quote.serviceLongitude, date: quote.date, time: quote.time,
      addOns: quote.addOns, addOnTotal: Math.round((quote.subtotalCents / 100) - ((await tx.select({ price: services.price }).from(services).where(eq(services.id, quote.serviceId)).limit(1))[0]?.price ?? 0)),
      totalPrice: Math.round(quote.totalAmountCents / 100), amount: quote.totalAmountCents,
      referralDiscountCents: quote.referralDiscountCents, referralCreditAppliedCents: quote.referralCreditAppliedCents,
      quoteId: quote.id, bookingIdempotencyKey: idempotencyKey,
      fulfillmentMode: quote.fulfillmentMode,
      slotReservedAt,
      isPaid: false, paymentStatus: "payment_pending", paymentExpiresAt: new Date(now.getTime() + PAYMENT_TTL_MS).toISOString(),
    }).returning();
    await tx.update(bookingQuotes).set({ consumedAt: now.toISOString(), bookingId: booking.id }).where(and(eq(bookingQuotes.id, quote.id), isNull(bookingQuotes.bookingId)));
    if (quote.referralDiscountCents > 0) {
      await tx.update(referrals).set({ relatedBookingId: booking.id }).where(and(eq(referrals.referredUserId, userId), eq(referrals.discountStatus, "applied"), isNull(referrals.relatedBookingId)));
    }
    return booking;
  });
}

export async function refundReferralCreditsForFailedPayment(bookingId: number, paymentStatus: "payment_failed" | "payment_cancelled" | "payment_expired") {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(${bookingId})`);
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking || booking.isPaid) return booking;
    const now = new Date().toISOString();
    if (booking.timeSlotId != null && booking.slotReservedAt && !booking.slotReservationReleasedAt) {
      await tx.update(timeSlots).set({
        currentBookings: sql`greatest(${timeSlots.currentBookings} - 1, 0)`,
      }).where(eq(timeSlots.id, booking.timeSlotId));
    }
    if (booking.referralCreditAppliedCents > 0 && !booking.referralCreditRefundedAt) {
      await tx.update(users).set({ referralCreditBalanceCents: sql`${users.referralCreditBalanceCents} + ${booking.referralCreditAppliedCents}` }).where(eq(users.id, booking.userId));
    }
    await tx.update(referrals).set({ discountStatus: "available", relatedBookingId: null }).where(and(
      eq(referrals.relatedBookingId, booking.id),
      eq(referrals.discountStatus, "applied"),
    ));
    const [updated] = await tx.update(bookings).set({
      paymentStatus,
      referralCreditRefundedAt: booking.referralCreditAppliedCents > 0 ? now : booking.referralCreditRefundedAt,
      slotReservationReleasedAt: booking.slotReservedAt && !booking.slotReservationReleasedAt ? now : booking.slotReservationReleasedAt,
    }).where(eq(bookings.id, bookingId)).returning();
    return updated;
  });
}

export async function nativePaymentStatus(userId: number, bookingId: number) {
  let [booking] = await db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId))).limit(1);
  if (!booking) throw new NativeContractError(404, "BOOKING_NOT_FOUND", "Booking not found.");
  if (!booking.isPaid && booking.stripeSessionId?.startsWith("pi_")) {
    let succeededIntentId: string | undefined;
    try {
      const { nativePaymentIntentDisposition, retrievePaymentSheetIntent, validateNativePaymentIntent } = await import("./payment-service");
      const intent = await retrievePaymentSheetIntent(booking.stripeSessionId);
      const [owner] = await db.select({ stripeCustomerId: users.stripeCustomerId }).from(users).where(eq(users.id, userId)).limit(1);
      const validation = validateNativePaymentIntent(intent, {
        paymentIntentId: booking.stripeSessionId,
        bookingId: booking.id,
        amountCents: booking.amount ?? Math.round((booking.totalPrice ?? 0) * 100),
        currency: "usd",
        customerId: owner?.stripeCustomerId ?? null,
      });
      if (!validation.valid) {
        console.warn("[Stripe] Native payment reconciliation validation blocked", {
          bookingId: booking.id,
          intentRef: `pi_…${intent.id.slice(-6)}`,
          status: intent.status,
          issues: validation.issues,
        });
        return booking;
      }
      if (nativePaymentIntentDisposition(intent) === "paid") {
        succeededIntentId = intent.id;
      }
    } catch (error) {
      const stripeError = error as { name?: unknown; type?: unknown; code?: unknown };
      console.error("[Stripe] Native payment reconciliation failed", {
        bookingId: booking.id,
        errorType: typeof stripeError.type === "string"
          ? stripeError.type
          : (typeof stripeError.name === "string" ? stripeError.name : "unknown"),
        errorCode: typeof stripeError.code === "string" ? stripeError.code : undefined,
      });
      return booking;
    }
    if (succeededIntentId) {
      const paid = await markNativeBookingPaid(booking.id, succeededIntentId);
      if (!paid) throw new NativeContractError(404, "BOOKING_NOT_FOUND", "Booking not found.");
      booking = paid.booking;
    }
  }
  if (!booking.isPaid && booking.paymentExpiresAt && new Date(booking.paymentExpiresAt).getTime() <= Date.now() && booking.paymentStatus !== "payment_expired") {
    return refundReferralCreditsForFailedPayment(booking.id, "payment_expired");
  }
  return booking;
}

export async function attachNativePaymentIntent(bookingId: number, idempotencyKey: string, paymentIntentId: string) {
  const [booking] = await db.update(bookings).set({
    stripeSessionId: paymentIntentId,
    paymentId: paymentIntentId,
    paymentIntentIdempotencyKey: idempotencyKey,
    paymentStatus: "payment_pending",
  }).where(eq(bookings.id, bookingId)).returning();
  return booking;
}

export async function markNativeBookingPaid(bookingId: number, intentId: string, paymentMethod?: string | null) {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(${bookingId})`);
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return undefined;
    if (booking.slotReservationReleasedAt) {
      throw new NativeContractError(409, "SLOT_RESERVATION_RELEASED", "Payment cannot be confirmed after slot capacity was released.");
    }
    const newlyPaid = !booking.isPaid;
    const [updated] = await tx.update(bookings).set({
      isPaid: true,
      paymentStatus: "completed",
      paymentDate: booking.paymentDate || new Date().toISOString(),
      stripeSessionId: intentId,
      status: newlyPaid ? "confirmed" : booking.status,
      ...(paymentMethod ? { paymentMethod } : {}),
    }).where(eq(bookings.id, bookingId)).returning();
    return { booking: updated, newlyPaid };
  });
}

export async function confirmZeroAmountBooking(bookingId: number) {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(${bookingId})`);
    const [existing] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!existing) return undefined;
    if (existing.slotReservationReleasedAt) throw new NativeContractError(409, "SLOT_RESERVATION_RELEASED", "Payment cannot be confirmed after slot capacity was released.");
    if (existing.isPaid) return existing;
    const [booking] = await tx.update(bookings).set({
      isPaid: true,
      paymentStatus: "paid",
      paymentDate: new Date().toISOString(),
      status: "confirmed",
    }).where(and(eq(bookings.id, bookingId), eq(bookings.isPaid, false))).returning();
    return booking;
  });
}
