import { desc, eq } from "drizzle-orm";
import { providerApplications, users } from "@shared/schema";
import { db } from "./db";

export const DEFAULT_PROVIDER_PRESENCE_TTL_MS = 3 * 60 * 1000;

export type ProviderEligibilitySnapshot = {
  isProvider: boolean;
  currentStatus: string | null;
  applicationStatus: string | null;
  lastHeartbeatAt: Date | string | null;
};

export type ProviderEligibility = {
  eligible: boolean;
  code: "ELIGIBLE" | "PROVIDER_REQUIRED" | "PROVIDER_NOT_ACTIVE" | "PROVIDER_OFFLINE" | "PROVIDER_PRESENCE_STALE";
};

export function providerPresenceTtlMs(): number {
  const seconds = Number(process.env.PROVIDER_PRESENCE_TTL_SECONDS ?? 180);
  return Math.min(900, Math.max(30, Number.isFinite(seconds) ? seconds : 180)) * 1000;
}

export function evaluateProviderEligibility(
  snapshot: ProviderEligibilitySnapshot,
  options: { requireOnline?: boolean; now?: Date; ttlMs?: number } = {},
): ProviderEligibility {
  if (!snapshot.isProvider) return { eligible: false, code: "PROVIDER_REQUIRED" };
  if (snapshot.currentStatus === "inactive" || snapshot.applicationStatus !== "active_provider") {
    return { eligible: false, code: "PROVIDER_NOT_ACTIVE" };
  }
  if (options.requireOnline === false) return { eligible: true, code: "ELIGIBLE" };
  if (snapshot.currentStatus !== "online") return { eligible: false, code: "PROVIDER_OFFLINE" };
  const heartbeatMs = snapshot.lastHeartbeatAt ? new Date(snapshot.lastHeartbeatAt).getTime() : Number.NaN;
  const nowMs = (options.now ?? new Date()).getTime();
  if (!Number.isFinite(heartbeatMs) || nowMs - heartbeatMs > (options.ttlMs ?? providerPresenceTtlMs())) {
    return { eligible: false, code: "PROVIDER_PRESENCE_STALE" };
  }
  return { eligible: true, code: "ELIGIBLE" };
}

export async function loadProviderEligibility(userId: number, requireOnline = true) {
  const [user] = await db.select({
    id: users.id,
    isProvider: users.isProvider,
    currentStatus: users.currentStatus,
    lastHeartbeatAt: users.lastHeartbeatAt,
    latitude: users.latitude,
    longitude: users.longitude,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return undefined;
  const [application] = await db.select({ applicationStatus: providerApplications.applicationStatus })
    .from(providerApplications)
    .where(eq(providerApplications.userId, userId))
    .orderBy(desc(providerApplications.id))
    .limit(1);
  return {
    user,
    applicationStatus: application?.applicationStatus ?? null,
    result: evaluateProviderEligibility({ ...user, applicationStatus: application?.applicationStatus ?? null }, { requireOnline }),
  };
}

export async function setProviderAvailability(userId: number, status: "online" | "offline") {
  const now = new Date();
  const [user] = await db.update(users).set(status === "online" ? {
    currentStatus: status,
    lastOnlineAt: now,
    lastHeartbeatAt: now,
  } : { currentStatus: status }).where(eq(users.id, userId)).returning();
  return user;
}

export async function touchProviderHeartbeat(userId: number) {
  const now = new Date();
  const [user] = await db.update(users).set({ lastHeartbeatAt: now })
    .where(eq(users.id, userId)).returning({ lastHeartbeatAt: users.lastHeartbeatAt });
  return user;
}
