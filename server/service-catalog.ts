import type { Service } from "@shared/schema";
import { bookableServices, isBookableService, serviceAvailability } from "@shared/service-catalog";
import { NativeContractError } from "./native-contract-error";

export function requireBookableService(service: Service | undefined, catalog?: readonly Service[]): asserts service is Service {
  if (!service) throw new NativeContractError(400, "INVALID_SERVICE", "Service not found.");
  if (!isBookableService(service) || (catalog && !bookableServices(catalog).some(s => s.id === service.id))) {
    throw new NativeContractError(409, "SERVICE_NOT_BOOKABLE", serviceAvailability(service) === "coming_soon"
      ? "Dapr Black Label Detail is Coming Soon and cannot be booked."
      : "This service is no longer available for new bookings.");
  }
}
