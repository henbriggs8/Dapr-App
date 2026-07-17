import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ADD_ONS_BY_ID } from "@shared/add-ons";
import { savedAddresses, services, users, vehicles } from "@shared/schema";
import { NativeContractError } from "./native-contract-error";

export const asapAvailabilityRequestSchema = z.object({
  addressId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  addOnIds: z.array(z.string()).default([]),
});

export function liveProviderAvailability(onlineProviderCount: number) {
  if (onlineProviderCount > 0) {
    return {
      available: true as const,
      mode: "asap" as const,
      etaText: "About 15–30 minutes",
      reason: null,
      onlineProviderCount,
    };
  }
  return {
    available: false as const,
    mode: "asap" as const,
    etaText: null,
    reason: "NO_ONLINE_PROVIDERS" as const,
    onlineProviderCount: 0,
  };
}

export async function getEligibleOnlineProviderCount(database?: any): Promise<number> {
  const executor = database ?? (await import("./db")).db;
  const providers = await executor.select({ id: users.id }).from(users).where(and(
    eq(users.isProvider, true),
    eq(users.currentStatus, "online"),
  ));
  // Intentionally do not exclude providers with active assignments. MVP providers
  // may accept multiple paid jobs and build a queue.
  return providers.length;
}

export async function getAsapAvailability(userId: number, raw: unknown) {
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

  // Saved native addresses do not yet have reliable coordinates. For MVP all
  // authenticated service addresses are treated as part of the Gilbert/Phoenix
  // operating area; exact distance filtering will replace this fallback later.
  return liveProviderAvailability(await getEligibleOnlineProviderCount(db));
}
