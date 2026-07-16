import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { z } from "zod";
import { ADD_ONS_BY_ID } from "@shared/add-ons";
import { savedAddresses, services, timeSlots, vehicles, type TimeSlot } from "@shared/schema";
import { NativeContractError } from "./native-contract-error";

const DEFAULT_ASAP_WINDOW_MINUTES = 180;
const DEFAULT_ASAP_MIN_LEAD_MINUTES = 15;
const DEFAULT_SERVICE_TIME_ZONE = "America/Phoenix";
const DEFAULT_SCHEDULE_LOOKAHEAD_DAYS = 14;

export const asapAvailabilityRequestSchema = z.object({
  addressId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  addOnIds: z.array(z.string()).default([]),
});

export type AsapAvailabilityConfig = {
  windowMinutes: number;
  minLeadMinutes: number;
  timeZone: string;
  scheduleLookaheadDays: number;
};

type AvailabilitySlot = Pick<TimeSlot, "id" | "date" | "startTime" | "endTime" | "isAvailable" | "maxBookings" | "currentBookings" | "isPublished">;

function positiveIntegerEnv(value: string | undefined, fallback: number, name: string): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export function asapAvailabilityConfig(env: NodeJS.ProcessEnv = process.env): AsapAvailabilityConfig {
  const timeZone = env.DAPR_SERVICE_TIME_ZONE?.trim() || DEFAULT_SERVICE_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error("DAPR_SERVICE_TIME_ZONE must be a valid IANA time zone.");
  }
  return {
    windowMinutes: positiveIntegerEnv(env.DAPR_ASAP_WINDOW_MINUTES, DEFAULT_ASAP_WINDOW_MINUTES, "DAPR_ASAP_WINDOW_MINUTES"),
    minLeadMinutes: positiveIntegerEnv(env.DAPR_ASAP_MIN_LEAD_MINUTES, DEFAULT_ASAP_MIN_LEAD_MINUTES, "DAPR_ASAP_MIN_LEAD_MINUTES"),
    timeZone,
    scheduleLookaheadDays: positiveIntegerEnv(env.DAPR_SCHEDULE_LOOKAHEAD_DAYS, DEFAULT_SCHEDULE_LOOKAHEAD_DAYS, "DAPR_SCHEDULE_LOOKAHEAD_DAYS"),
  };
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function slotStartInstant(slot: Pick<TimeSlot, "date" | "startTime">, timeZone: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(slot.date);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(slot.startTime);
  if (!dateMatch || !timeMatch) throw new Error(`Invalid time slot date/time: ${slot.date} ${slot.startTime}`);
  const desiredUtc = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
  let candidate = desiredUtc;
  for (let pass = 0; pass < 3; pass++) {
    const parts = zonedParts(new Date(candidate), timeZone);
    const representedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    candidate -= representedUtc - desiredUtc;
  }
  return new Date(candidate);
}

function serializedSlot(slot: AvailabilitySlot) {
  return {
    timeSlotId: slot.id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
}

function etaText(minutes: number): string {
  const lower = Math.max(15, Math.floor(minutes / 15) * 15);
  return `About ${lower}–${lower + 30} minutes`;
}

export function isAsapSlotCandidate(slot: AvailabilitySlot, now: Date, config: AsapAvailabilityConfig): boolean {
  if (!slot.isPublished || !slot.isAvailable || slot.currentBookings >= slot.maxBookings) return false;
  const start = slotStartInstant(slot, config.timeZone).getTime();
  return start >= now.getTime() + config.minLeadMinutes * 60_000
    && start <= now.getTime() + config.windowMinutes * 60_000;
}

export function selectAsapAvailability(slots: AvailabilitySlot[], now: Date, config: AsapAvailabilityConfig) {
  const earliest = now.getTime() + config.minLeadMinutes * 60_000;
  const windowEnd = now.getTime() + config.windowMinutes * 60_000;
  const candidates = slots
    .filter(slot => slot.isPublished && slot.isAvailable && slot.currentBookings < slot.maxBookings)
    .map(slot => ({ slot, start: slotStartInstant(slot, config.timeZone) }))
    .sort((left, right) => left.start.getTime() - right.start.getTime());
  const asap = candidates.find(candidate => candidate.start.getTime() >= earliest && candidate.start.getTime() <= windowEnd);
  const checkedAt = now.toISOString();
  if (asap) {
    const estimatedArrivalMinutes = Math.max(0, Math.ceil((asap.start.getTime() - now.getTime()) / 60_000));
    return {
      available: true as const,
      mode: "asap" as const,
      timeZone: config.timeZone,
      windowMinutes: config.windowMinutes,
      checkedAt,
      slot: serializedSlot(asap.slot),
      estimatedArrivalMinutes,
      etaText: etaText(estimatedArrivalMinutes),
    };
  }
  const fallback = candidates.find(candidate => candidate.start.getTime() > windowEnd);
  return {
    available: false as const,
    mode: "asap" as const,
    reason: "NO_CAPACITY_IN_WINDOW" as const,
    timeZone: config.timeZone,
    windowMinutes: config.windowMinutes,
    checkedAt,
    fallbackSlot: fallback ? serializedSlot(fallback.slot) : null,
  };
}

export async function getAsapAvailability(userId: number, raw: unknown, now = new Date()) {
  const { db } = await import("./db");
  const input = asapAvailabilityRequestSchema.parse(raw);
  const [address] = await db.select({ id: savedAddresses.id }).from(savedAddresses).where(and(
    eq(savedAddresses.id, input.addressId),
    eq(savedAddresses.userId, userId),
  )).limit(1);
  if (!address) throw new NativeContractError(404, "ADDRESS_NOT_FOUND", "Saved address not found.");
  const [service] = await db.select({ id: services.id }).from(services).where(eq(services.id, input.serviceId)).limit(1);
  if (!service) throw new NativeContractError(400, "INVALID_SERVICE", "Service not found.");
  const [vehicle] = await db.select({ id: vehicles.id }).from(vehicles).where(and(
    eq(vehicles.id, input.vehicleId),
    eq(vehicles.userId, userId),
  )).limit(1);
  if (!vehicle) throw new NativeContractError(403, "VEHICLE_ACCESS_DENIED", "Vehicle does not belong to this account.");
  const invalidAddOnIds = Array.from(new Set(input.addOnIds)).filter(id => !ADD_ONS_BY_ID[id]);
  if (invalidAddOnIds.length) throw new NativeContractError(400, "INVALID_ADD_ON", `Unknown add-on IDs: ${invalidAddOnIds.join(", ")}`);

  const config = asapAvailabilityConfig();
  const firstDate = dateInTimeZone(now, config.timeZone);
  const lastDate = addCalendarDays(firstDate, config.scheduleLookaheadDays);
  // This deliberately queries existing rows only. It never calls storage.getAvailableTimeSlots(),
  // whose legacy behavior can generate synthetic 8 AM–4 PM capacity.
  const slots = await db.select().from(timeSlots).where(and(
    eq(timeSlots.isAvailable, true),
    eq(timeSlots.isPublished, true),
    lt(timeSlots.currentBookings, timeSlots.maxBookings),
    gte(timeSlots.date, firstDate),
    lte(timeSlots.date, lastDate),
  )).orderBy(asc(timeSlots.date), asc(timeSlots.startTime));
  return selectAsapAvailability(slots, now, config);
}
