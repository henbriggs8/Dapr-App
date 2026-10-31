import { inArray } from "drizzle-orm";
import { bookingQuotes, services, type Booking } from "@shared/schema";
import { db } from "./db";
import { providerPayoutCents, resolveServiceSubtotalCents, type CompensationBooking } from "./provider-compensation";

type CompensationReader = Pick<typeof db, "select">;

// Read only; batch the same source lookup for available, accepted, and reporting callers.
export async function loadBookingServiceSubtotals(rows: CompensationBooking[], reader: CompensationReader = db) {
  const quoteIds = Array.from(new Set(rows.flatMap(row => row.quoteId ? [row.quoteId] : [])));
  const serviceIds = Array.from(new Set(rows.filter(row => !row.quoteId).map(row => row.serviceId)));
  const [quotes, catalog] = await Promise.all([
    quoteIds.length ? reader.select({ id: bookingQuotes.id, userId: bookingQuotes.userId, serviceId: bookingQuotes.serviceId,
      bookingId: bookingQuotes.bookingId, subtotalCents: bookingQuotes.subtotalCents }).from(bookingQuotes).where(inArray(bookingQuotes.id, quoteIds)) : [],
    serviceIds.length ? reader.select({ id: services.id, price: services.price }).from(services).where(inArray(services.id, serviceIds)) : [],
  ]);
  const quoteMap = new Map(quotes.map(quote => [quote.id, quote]));
  const serviceMap = new Map(catalog.map(service => [service.id, service]));
  return new Map(rows.map(row => [row.id, resolveServiceSubtotalCents(row,
    row.quoteId ? quoteMap.get(row.quoteId) : null, serviceMap.get(row.serviceId))]));
}

// Called inside the completion transaction after locking the booking. Existing
// finalized cents are preserved; an estimate is never persisted by a GET request.
export async function earningsForCompletedBooking(booking: Booking, reader: CompensationReader = db) {
  if (booking.providerEarnings != null || booking.providerId == null) return booking.providerEarnings;
  const subtotals = await loadBookingServiceSubtotals([booking], reader);
  const earnings = providerPayoutCents(booking, subtotals.get(booking.id));
  if (earnings == null) throw new Error("Cannot finalize provider earnings: service subtotal is unavailable");
  return earnings;
}
