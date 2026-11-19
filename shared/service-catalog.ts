import type { Service } from "./schema";

export type ServiceAvailability = "available" | "coming_soon" | "retired";
type CatalogService = Pick<Service, "category"> & { bookingAvailability?: ServiceAvailability; isBookable?: boolean };

// Availability is application policy, not a new database column. Preserve
// numeric legacy prices for history/older clients; never render a coming-soon price.
export const CANONICAL_SERVICE_CATALOG = [
  { name: "Essential Wash", description: "Hand wash, spray wax, vacuum, quick interior wipe-down", price: 39, duration: 30, category: "basic" },
  { name: "Refresh Detail", description: "Basic interior cleaning with an upgraded exterior clean.\n\nInterior includes vacuuming, wipe-down, seats, cupholders, and dashboard cleaning.\n\nExterior includes a hand wash, spray wax, and cleaning of the wheels and tires.", price: 149, duration: 90, category: "standard" },
  { name: "Dapr Black Label Detail", description: "Our most elevated detailing experience is coming soon. Not available to book.", price: 299, duration: 180, category: "premium" },
] as const;

export function serviceAvailability(service: Pick<Service, "category">): ServiceAvailability {
  if (service.category === "basic" || service.category === "standard") return "available";
  if (service.category === "premium") return "coming_soon";
  return "retired";
}

export function isBookableService(service: CatalogService): boolean {
  return serviceAvailability(service) === "available" && service.isBookable !== false
    && (!service.bookingAvailability || service.bookingAvailability === "available");
}

export function catalogService<T extends Service>(service: T, catalog?: readonly Service[]) {
  const selected = !catalog || customerVisibleServices(catalog).some(s => s.id === service.id);
  const bookingAvailability = selected ? serviceAvailability(service) : "retired";
  return { ...service, bookingAvailability, isBookable: selected && isBookableService(service),
    customerVisible: bookingAvailability !== "retired",
    displayPrice: bookingAvailability === "available" ? service.price : null };
}

export function customerVisibleServices<T extends Service>(services: readonly T[]): T[] {
  // Read old rows without deleting/repointing history; show one definition per tier.
  const ordered = [...services].sort((a, b) => a.id - b.id);
  return ["basic", "standard", "premium"].flatMap(category => {
    const service = ordered.find(s => s.category === category);
    return service ? [service] : [];
  });
}

export function bookableServices<T extends Service>(services: readonly T[]): T[] {
  return customerVisibleServices(services).filter(isBookableService);
}
