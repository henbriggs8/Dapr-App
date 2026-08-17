import { and, asc, eq, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { bookings, notificationEvents, services, users, vehicles } from "@shared/schema";
import { db } from "./db";
import { sendPaidBookingEmail } from "./email-service";

const STALE_PROCESSING_MS = 10 * 60 * 1000;
const FAILURE_SUMMARY_MAX_LENGTH = 500;
const RETRY_CAP_MS = 60 * 60 * 1000;

function safeErrorSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, FAILURE_SUMMARY_MAX_LENGTH);
}

/** Claims one pending/failed or stale-processing delivery without allowing a
 * second process to send it concurrently. */
async function claimNextDelivery() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS);
  const [candidate] = await db
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(and(
      eq(notificationEvents.notificationType, "paid_booking_admin"),
      or(
        and(eq(notificationEvents.status, "pending"), or(lt(notificationEvents.nextAttemptAt, now), sql`${notificationEvents.nextAttemptAt} IS NULL`)),
        and(eq(notificationEvents.status, "failed"), or(lt(notificationEvents.nextAttemptAt, now), sql`${notificationEvents.nextAttemptAt} IS NULL`)),
        and(eq(notificationEvents.status, "processing"), lt(notificationEvents.lastAttemptedAt, staleBefore)),
      ),
    ))
    .orderBy(asc(notificationEvents.createdAt))
    .limit(1);
  if (!candidate) return undefined;

  const claimToken = randomUUID();
  const [claimed] = await db.update(notificationEvents).set({
    status: "processing",
    attemptCount: sql`${notificationEvents.attemptCount} + 1`,
    firstAttemptedAt: sql`coalesce(${notificationEvents.firstAttemptedAt}, ${now})`,
    lastAttemptedAt: now,
    nextAttemptAt: null,
    claimToken,
    errorMessage: null,
  }).where(and(
    eq(notificationEvents.id, candidate.id),
    or(
        and(eq(notificationEvents.status, "pending"), or(lt(notificationEvents.nextAttemptAt, now), sql`${notificationEvents.nextAttemptAt} IS NULL`)),
        and(eq(notificationEvents.status, "failed"), or(lt(notificationEvents.nextAttemptAt, now), sql`${notificationEvents.nextAttemptAt} IS NULL`)),
      and(eq(notificationEvents.status, "processing"), lt(notificationEvents.lastAttemptedAt, staleBefore)),
    ),
  )).returning();
  // The conditional UPDATE is the claim; a competing process returns no row.
  return claimed ? { ...claimed, claimToken } : undefined;
}

async function sendClaimedDelivery(event: typeof notificationEvents.$inferSelect) {
  if (!event.bookingId) throw new Error("Paid booking notification is missing its booking ID");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, event.bookingId)).limit(1);
  if (!booking) throw new Error("Booking no longer exists");
  const [customer] = await db.select().from(users).where(eq(users.id, booking.userId)).limit(1);
  const [service] = await db.select().from(services).where(eq(services.id, booking.serviceId)).limit(1);
  const [vehicle] = booking.vehicleId
    ? await db.select().from(vehicles).where(eq(vehicles.id, booking.vehicleId)).limit(1)
    : [];
  const [provider] = booking.providerId
    ? await db.select().from(users).where(eq(users.id, booking.providerId)).limit(1)
    : [];
  const paymentReference = typeof event.metadata === "object" && event.metadata && "paymentReference" in event.metadata
    ? String((event.metadata as Record<string, unknown>).paymentReference)
    : booking.stripeSessionId || booking.paymentId || null;
  const siteUrl = process.env.SITE_URL || "https://autodapr.com";
  return sendPaidBookingEmail({
    bookingId: booking.id,
    customerName: customer?.name || customer?.username || customer?.email || "Unknown customer",
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    serviceLocation: booking.serviceLocation,
    serviceName: service?.name,
    amountPaidCents: booking.amount ?? (booking.totalPrice != null ? Math.round(booking.totalPrice * 100) : null),
    date: booking.date,
    time: booking.time,
    priceTier: booking.priceTier,
    addOns: Array.isArray(booking.addOns) ? booking.addOns : [],
    vehicle: vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" ") : null,
    providerName: provider?.name || provider?.username || null,
    bookingStatus: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentReference,
    paymentConfirmedAt: booking.paymentDate,
    adminBookingUrl: `${siteUrl.replace(/\/$/, "")}/admin?booking=${booking.id}`,
    idempotencyKey: event.idempotencyKey,
    recipient: event.recipient,
  });
}

/** Runs a bounded outbox pass. It is safe to call after every paid transition
 * and on a timer; the durable claim and idempotency key do the deduplication. */
export async function dispatchPaidBookingNotifications(limit = 10): Promise<void> {
  for (let i = 0; i < limit; i += 1) {
    const event = await claimNextDelivery();
    if (!event) return;
    try {
      const { messageId } = await sendClaimedDelivery(event);
      await db.update(notificationEvents).set({
        status: "sent",
        providerMessageId: messageId,
        errorMessage: null,
        sentAt: new Date(),
        claimToken: null,
      }).where(and(eq(notificationEvents.id, event.id), eq(notificationEvents.status, "processing"), eq(notificationEvents.claimToken, event.claimToken)));
      console.log(`[notification] Paid booking email sent for booking ${event.bookingId}`);
    } catch (error) {
      const summary = safeErrorSummary(error);
      const delayMs = Math.min(RETRY_CAP_MS, 30_000 * (2 ** Math.min(event.attemptCount, 7)));
      await db.update(notificationEvents).set({
        status: "failed",
        errorMessage: summary,
        failedAt: new Date(),
        nextAttemptAt: new Date(Date.now() + delayMs),
        claimToken: null,
      }).where(and(eq(notificationEvents.id, event.id), eq(notificationEvents.status, "processing"), eq(notificationEvents.claimToken, event.claimToken)));
      console.error(`[notification] Paid booking email failed for booking ${event.bookingId}:`, summary);
    }
  }
}

export async function getBookingNotificationEvents(bookingId: number) {
  return db.select().from(notificationEvents)
    .where(eq(notificationEvents.bookingId, bookingId))
    .orderBy(asc(notificationEvents.createdAt));
}