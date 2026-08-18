import { and, eq, isNull, sql } from "drizzle-orm";
import { bookings } from "@shared/schema";
import { db } from "./db";

export function providerHasPassed(previousProviders: unknown, providerId: number): boolean {
  return Array.isArray(previousProviders) && previousProviders.some(value => Number(value) === providerId);
}

export async function passMarketplaceBooking(bookingId: number, providerId: number) {
  const [booking] = await db.update(bookings).set({
    previousProviders: sql`CASE
      WHEN COALESCE(${bookings.previousProviders}, '[]'::json)::jsonb @> jsonb_build_array(${providerId})
      THEN ${bookings.previousProviders}
      ELSE (COALESCE(${bookings.previousProviders}, '[]'::json)::jsonb || jsonb_build_array(${providerId}))::json
    END`,
  }).where(and(
    eq(bookings.id, bookingId),
    eq(bookings.isPaid, true),
    eq(bookings.status, "confirmed"),
    isNull(bookings.providerId),
  )).returning();
  if (!booking) throw new Error("Job is no longer available");
  return booking;
}
