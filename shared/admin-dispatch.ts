export type AdminDispatchBookingCandidate = {
  status?: string | null;
  isPaid?: boolean | null;
  paymentStatus?: string | null;
  providerId?: number | null;
};

const PAID_PAYMENT_STATUSES = new Set(["completed", "paid"]);

export function isAdminDispatchCandidate(
  booking: AdminDispatchBookingCandidate,
): boolean {
  return (
    booking.status === "confirmed" &&
    booking.isPaid === true &&
    PAID_PAYMENT_STATUSES.has(booking.paymentStatus ?? "") &&
    booking.providerId == null
  );
}
