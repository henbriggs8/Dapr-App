import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { bookings, notificationEvents, services, users, vehicles } from "@shared/schema";
import { db } from "./db";
import { sendPaidBookingEmail } from "./email-service";
import { DatabasePushDeviceRepository, type PushEnvironment } from "./push-device-repository";
import { PushService } from "./push-service";
import { loadProviderEligibility } from "./provider-eligibility";

const STALE_PROCESSING_MS = 10 * 60 * 1000;
const FAILURE_SUMMARY_MAX_LENGTH = 500;
const RETRY_CAP_MS = 60 * 60 * 1000;
const SUPPORTED_NOTIFICATION_TYPES = [
  "paid_booking_admin",
  "provider_job_available_fanout",
  "provider_job_available",
  "provider_job_assigned",
  "provider_job_cancelled",
] as const;
/** Provider delivery types gated by PROVIDER_NOTIFICATION_DISPATCH_ENABLED.
 * They cover provider.job_available (fanout + per-provider), provider.job_assigned,
 * and provider.job_cancelled. paid_booking_admin is intentionally excluded. */
const PROVIDER_NOTIFICATION_TYPES = [
  "provider_job_available_fanout",
  "provider_job_available",
  "provider_job_assigned",
  "provider_job_cancelled",
] as const;

function pushEnvironment(): PushEnvironment {
  const configured = process.env.PUSH_NOTIFICATION_ENVIRONMENT;
  if (configured === "production" || configured === "development") return configured;
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isPaidBookingNotificationDispatchEnabled(): boolean {
  const configured = process.env.BOOKING_NOTIFICATION_DISPATCH_ENABLED?.trim().toLowerCase();
  // Preserve the existing notification behavior unless an operator explicitly
  // disables delivery. Events are always recorded, independently of this gate.
  return !["false", "0", "off", "no"].includes(configured ?? "");
}

/** Provider push delivery is a controlled rollout: it stays OFF unless an
 * operator explicitly enables it. When off, provider outbox rows are never
 * claimed — they remain pending/retryable and are not marked sent or failed.
 * The paid-booking admin email is governed only by
 * BOOKING_NOTIFICATION_DISPATCH_ENABLED and is unaffected by this switch. */
export function isProviderNotificationDispatchEnabled(): boolean {
  const configured = process.env.PROVIDER_NOTIFICATION_DISPATCH_ENABLED?.trim().toLowerCase();
  return ["true", "1", "on", "yes"].includes(configured ?? "");
}

function claimableNotificationTypes(): string[] {
  return isProviderNotificationDispatchEnabled()
    ? [...SUPPORTED_NOTIFICATION_TYPES]
    : SUPPORTED_NOTIFICATION_TYPES.filter(
        type => !(PROVIDER_NOTIFICATION_TYPES as readonly string[]).includes(type),
      );
}

function safeErrorSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, FAILURE_SUMMARY_MAX_LENGTH);
}

/** Claims one pending/failed or stale-processing delivery without allowing a
 * second process to send it concurrently. */
async function claimNextDelivery() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS);
  const claimableTypes = claimableNotificationTypes();
  const [candidate] = await db
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(and(
      inArray(notificationEvents.notificationType, claimableTypes),
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

async function sendAdminEmail(event: typeof notificationEvents.$inferSelect) {
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

async function fanOutAvailableJob(event: typeof notificationEvents.$inferSelect) {
  if (!event.bookingId) throw new Error("Provider job event is missing its booking ID");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, event.bookingId)).limit(1);
  if (!booking || !booking.isPaid || booking.status !== "confirmed" || booking.providerId) {
    return { messageId: "skipped:not-available" };
  }
  const previous = new Set(Array.isArray(booking.previousProviders) ? booking.previousProviders as number[] : []);
  const candidates = await db.select({ id: users.id, latitude: users.latitude, longitude: users.longitude })
    .from(users).where(eq(users.isProvider, true));
  let inserted = 0;
  for (const provider of candidates) {
    if (previous.has(provider.id)) continue;
    const eligibility = await loadProviderEligibility(provider.id);
    if (!eligibility?.result.eligible) continue;
    if (booking.serviceLatitude != null && booking.serviceLongitude != null) {
      if (provider.latitude == null || provider.longitude == null) continue;
      if (distanceMiles(provider.latitude, provider.longitude, booking.serviceLatitude, booking.serviceLongitude) > 15) continue;
    }
    const result = await db.insert(notificationEvents).values({
      eventType: "provider.job_available",
      bookingId: booking.id,
      userId: booking.userId,
      providerId: provider.id,
      recipient: `provider:${provider.id}`,
      channel: "push",
      provider: "firebase",
      notificationType: "provider_job_available",
      status: "pending",
      idempotencyKey: `provider.job_available:${booking.id}:provider:${provider.id}`,
      metadata: { event: "provider.job_available", bookingId: String(booking.id) },
    }).onConflictDoNothing({ target: notificationEvents.idempotencyKey }).returning({ id: notificationEvents.id });
    inserted += result.length;
  }
  return { messageId: `fanout:${inserted}` };
}

async function sendProviderPush(event: typeof notificationEvents.$inferSelect) {
  if (!event.bookingId || !event.providerId) throw new Error("Provider push is missing its booking or provider ID");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, event.bookingId)).limit(1);
  if (!booking) return { messageId: "skipped:missing-booking" };
  if (event.notificationType === "provider_job_available") {
    const previous = Array.isArray(booking.previousProviders) ? booking.previousProviders as number[] : [];
    const eligibility = await loadProviderEligibility(event.providerId);
    if (!eligibility?.result.eligible || !booking.isPaid || booking.status !== "confirmed" || booking.providerId || previous.includes(event.providerId)) {
      return { messageId: "skipped:no-longer-eligible" };
    }
  } else if (event.notificationType === "provider_job_assigned" && booking.providerId !== event.providerId) {
    return { messageId: "skipped:reassigned" };
  }
  const content = event.notificationType === "provider_job_cancelled"
    ? { title: "Booking cancelled", body: "An assigned booking was cancelled." }
    : event.notificationType === "provider_job_assigned"
      ? { title: "New assignment", body: "A booking has been assigned to you." }
      : { title: "New job available", body: "A nearby paid job is available." };
  const result = await new PushService(new DatabasePushDeviceRepository()).send({
    userId: event.providerId,
    appType: "provider",
    environment: pushEnvironment(),
    ...content,
    data: { event: event.eventType, bookingId: String(event.bookingId) },
  });
  if (result.failed > 0) throw new Error(`Provider push failed for ${result.failed} device(s)`);
  return { messageId: result.delivered > 0 ? `firebase:${result.delivered}` : "skipped:no-device" };
}

async function sendClaimedDelivery(event: typeof notificationEvents.$inferSelect) {
  if (event.notificationType === "paid_booking_admin") return sendAdminEmail(event);
  if (event.notificationType === "provider_job_available_fanout") return fanOutAvailableJob(event);
  return sendProviderPush(event);
}

/** Runs a bounded outbox pass. It is safe to call after every paid transition
 * and on a timer; the durable claim and idempotency key do the deduplication. */
export async function dispatchPaidBookingNotifications(
  limit = 10,
  deliver: (event: typeof notificationEvents.$inferSelect) => Promise<{ messageId: string }> = sendClaimedDelivery,
): Promise<void> {
  for (let i = 0; i < limit; i += 1) {
    const event = await claimNextDelivery();
    if (!event) return;
    // Recheck the provider rollout gate after the claim: the flag may have
    // been disabled between selection and delivery. Release the row untouched
    // (pending, attempt not counted) instead of attempting provider delivery.
    if (
      (PROVIDER_NOTIFICATION_TYPES as readonly string[]).includes(event.notificationType)
      && !isProviderNotificationDispatchEnabled()
    ) {
      await db.update(notificationEvents).set({
        status: "pending",
        attemptCount: sql`greatest(${notificationEvents.attemptCount} - 1, 0)`,
        claimToken: null,
      }).where(and(eq(notificationEvents.id, event.id), eq(notificationEvents.status, "processing"), eq(notificationEvents.claimToken, event.claimToken)));
      continue;
    }
    try {
      const { messageId } = await deliver(event);
      await db.update(notificationEvents).set({
        status: "sent",
        providerMessageId: messageId,
        errorMessage: null,
        sentAt: new Date(),
        claimToken: null,
      }).where(and(eq(notificationEvents.id, event.id), eq(notificationEvents.status, "processing"), eq(notificationEvents.claimToken, event.claimToken)));
      console.log(`[notification] ${event.notificationType} delivered for booking ${event.bookingId}`);
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
      console.error(`[notification] ${event.notificationType} failed for booking ${event.bookingId}:`, summary);
    }
  }
}

/** The single safe entry point for both the API process and a scheduled
 * deployment. When disabled, it intentionally leaves pending rows untouched. */
export async function runPaidBookingNotificationDispatch(
  deliver?: (event: typeof notificationEvents.$inferSelect) => Promise<{ messageId: string }>,
): Promise<{ enabled: boolean }> {
  if (!isPaidBookingNotificationDispatchEnabled()) {
    console.info("[notification] Dispatcher is disabled by BOOKING_NOTIFICATION_DISPATCH_ENABLED.");
    return { enabled: false };
  }
  await dispatchPaidBookingNotifications(10, deliver);
  return { enabled: true };
}

export async function getBookingNotificationEvents(bookingId: number) {
  return db.select().from(notificationEvents)
    .where(eq(notificationEvents.bookingId, bookingId))
    .orderBy(asc(notificationEvents.createdAt));
}
