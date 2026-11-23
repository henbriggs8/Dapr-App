import { and, eq, sql } from "drizzle-orm";
import { bookings, referrals, timeSlots, users, type Booking } from "@shared/schema";
import { db } from "./db";
import { NativeContractError } from "./native-contract-error";

export function assertBookingPaymentOpen(booking: Booking): void {
  if (!booking.isPaid && (booking.status === "cancelled" || booking.paymentStatus === "payment_cancelled")) {
    throw new NativeContractError(409, "BOOKING_CANCELLED", "This booking has been cancelled; request a new quote.");
  }
  if (!booking.isPaid && booking.slotReservationReleasedAt) {
    throw new NativeContractError(409, "SLOT_RESERVATION_RELEASED", "Payment cannot be confirmed after slot capacity was released.");
  }
}

export async function cancelUnpaidNativeBooking(userId: number, bookingId: number) {
  return db.transaction(async tx => {
    // Same lock as payment confirmation and intent attachment; capacity and
    // credit restoration commit with cancellation, never as a separate step.
    await tx.execute(sql`select pg_advisory_xact_lock(${bookingId})`);
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1).for("update");
    if (!booking) throw new NativeContractError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (booking.userId !== userId) throw new NativeContractError(403, "BOOKING_ACCESS_DENIED", "Booking does not belong to this account.");
    if (!booking.isPaid && booking.status === "cancelled" && booking.paymentStatus === "payment_cancelled") {
      return { booking, newlyCancelled: false };
    }
    if (booking.isPaid || booking.status !== "awaiting_payment" || !booking.quoteId || booking.providerId != null) {
      throw new NativeContractError(409, "BOOKING_NOT_CANCELLABLE", "Booking cannot be cancelled in its current state.");
    }
    // Never abandon an existing payable intent or Checkout URL. Reconciling or
    // cancelling those with Stripe is a separate flow, not a local status edit.
    if (booking.paymentId || booking.stripeSessionId || booking.paymentUrl || booking.paymentIntentIdempotencyKey
      || !["pending", "payment_pending", "payment_failed", "payment_expired", "payment_cancelled"].includes(booking.paymentStatus ?? "")) {
      throw new NativeContractError(409, "PAYMENT_RECONCILIATION_REQUIRED", "An existing payment attempt must be resolved before cancelling. Please contact support.");
    }
    const now = new Date().toISOString();
    if (booking.timeSlotId != null && booking.slotReservedAt && !booking.slotReservationReleasedAt) {
      await tx.update(timeSlots).set({ currentBookings: sql`greatest(${timeSlots.currentBookings} - 1, 0)` }).where(eq(timeSlots.id, booking.timeSlotId));
    }
    if (booking.referralCreditAppliedCents > 0 && !booking.referralCreditRefundedAt) {
      await tx.update(users).set({ referralCreditBalanceCents: sql`${users.referralCreditBalanceCents} + ${booking.referralCreditAppliedCents}` }).where(eq(users.id, userId));
    }
    await tx.update(referrals).set({ discountStatus: "available", relatedBookingId: null }).where(and(eq(referrals.relatedBookingId, bookingId), eq(referrals.discountStatus, "applied")));
    const [cancelled] = await tx.update(bookings).set({
      status: "cancelled", paymentStatus: "payment_cancelled",
      referralCreditRefundedAt: booking.referralCreditAppliedCents > 0 ? (booking.referralCreditRefundedAt ?? now) : booking.referralCreditRefundedAt,
      slotReservationReleasedAt: booking.slotReservedAt ? (booking.slotReservationReleasedAt ?? now) : booking.slotReservationReleasedAt,
    }).where(eq(bookings.id, bookingId)).returning();
    return { booking: cancelled, newlyCancelled: true };
  });
}
