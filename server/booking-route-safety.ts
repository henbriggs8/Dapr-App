import type { Booking, User } from "@shared/schema";

type BookingActor = Pick<User, "id" | "isProvider" | "isAdmin">;
type BookingAccess = Pick<Booking, "userId" | "providerId" | "status">;

type PublicProvider = Pick<
  User,
  "id" | "name" | "description" | "profileImage" | "rating" | "ratingCount" | "currentStatus"
>;

type AvailableJob = Pick<
  Booking,
  "id" | "serviceId" | "serviceLocation" | "date" | "time" | "totalPrice" | "serviceDuration" | "notes"
>;

export function serializePublicProvider(provider: PublicProvider) {
  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    profileImage: provider.profileImage,
    rating: provider.rating,
    ratingCount: provider.ratingCount,
    currentStatus: provider.currentStatus,
  };
}

export function serializeAvailableJob(
  booking: AvailableJob,
  details: { customerFirstName: string | null; vehicleLabel: string | null; distance: number | null },
) {
  return {
    id: booking.id,
    serviceId: booking.serviceId,
    serviceLocation: booking.serviceLocation,
    date: booking.date,
    time: booking.time,
    totalPrice: booking.totalPrice,
    serviceDuration: booking.serviceDuration,
    notes: booking.notes,
    customerFirstName: details.customerFirstName,
    vehicleLabel: details.vehicleLabel,
    distance: details.distance,
  };
}

export function canAccessBookingTracking(actor: BookingActor, booking: BookingAccess): boolean {
  return actor.isAdmin || booking.userId === actor.id || (actor.isProvider && booking.providerId === actor.id);
}

export function canMutateAssignedBooking(actor: BookingActor, booking: BookingAccess): boolean {
  return actor.isAdmin || (actor.isProvider && booking.providerId === actor.id);
}

const PROVIDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  assigned: ["confirmed", "on_the_way"],
  confirmed: ["on_the_way", "in_progress"],
  on_the_way: ["arrived", "in_progress"],
  arrived: ["in_progress"],
  in_progress: ["completed"],
};

export function isAllowedProviderStatusTransition(current: string, next: unknown): next is string {
  if (typeof next !== "string") return false;
  if (next === current) return true;
  return PROVIDER_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

const PROVIDER_STAGES = new Set([
  "on_the_way",
  "en_route",
  "arrival",
  "arrived",
  "setting_up",
  "service_in_progress",
  "pre_wash",
  "exterior_washing",
  "interior_cleaning",
  "washing",
  "drying",
  "finishing",
  "quality_check",
  "completed",
]);

export function isAllowedProviderStage(stage: unknown): stage is string {
  return typeof stage === "string" && PROVIDER_STAGES.has(stage);
}

export function unknownAddOnIds(ids: unknown, knownIds: ReadonlySet<string>): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && !knownIds.has(id))));
}
