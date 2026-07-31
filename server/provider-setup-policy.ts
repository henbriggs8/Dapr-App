import {
  PROVIDER_APPLICATION_MEDIA_TYPES,
  type ProviderApplicationMedia,
  type ProviderApplicationSetup,
} from "@shared/schema";

export const REQUIRED_SERVICE_GUIDE_VERSION = "1.0";
export const MIN_PROVIDER_TRAVEL_RADIUS = 5;
export const MAX_PROVIDER_TRAVEL_RADIUS = 50;
export const MAX_PROVIDER_SERVICE_ZIPS = 50;

export class ProviderSetupError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ProviderSetupError";
  }
}

export type ServiceAreaInput = {
  region: string;
  zipCodes: string[];
  maxTravelRadius: number;
};

export type ActivationBlocker =
  | "invalid_application_state"
  | "vehicle_verification_incomplete"
  | "service_guide_incomplete"
  | "service_area_incomplete"
  | "training_incomplete";

export function assertSetupOwner(
  application: { userId: number | null },
  userId: number,
): void {
  if (application.userId !== userId) {
    throw new ProviderSetupError(
      403,
      "ACCESS_DENIED",
      "This provider application does not belong to the signed-in user.",
    );
  }
}

export function assertSetupAccessible(application: { applicationStatus: string }): void {
  if (!["approved_needs_setup", "active_provider"].includes(application.applicationStatus)) {
    throw new ProviderSetupError(
      409,
      "SETUP_NOT_AVAILABLE",
      "Provider setup is only available after vehicle verification is approved.",
    );
  }
}

export function validateServiceGuideAcknowledgement(input: unknown): string {
  const version = input && typeof input === "object"
    ? (input as Record<string, unknown>).version
    : undefined;
  if (typeof version !== "string" || version.trim() !== REQUIRED_SERVICE_GUIDE_VERSION) {
    throw new ProviderSetupError(
      409,
      "SERVICE_GUIDE_VERSION_MISMATCH",
      `The current service guide version is ${REQUIRED_SERVICE_GUIDE_VERSION}.`,
      { requiredVersion: REQUIRED_SERVICE_GUIDE_VERSION },
    );
  }
  return REQUIRED_SERVICE_GUIDE_VERSION;
}

export function validateServiceArea(input: unknown): ServiceAreaInput {
  if (!input || typeof input !== "object") {
    throw new ProviderSetupError(400, "INVALID_REQUEST", "Service-area details are required.");
  }
  const body = input as Record<string, unknown>;
  const region = typeof body.region === "string"
    ? body.region.trim().replace(/\s+/g, " ")
    : "";
  if (!region || region.length > 100) {
    throw new ProviderSetupError(
      422,
      "INVALID_SERVICE_REGION",
      "Operating region is required and must be 100 characters or fewer.",
    );
  }
  if (!Array.isArray(body.zipCodes) || body.zipCodes.length === 0) {
    throw new ProviderSetupError(
      422,
      "SERVICE_AREA_ZIPS_REQUIRED",
      "At least one operating ZIP code is required.",
    );
  }
  if (body.zipCodes.length > MAX_PROVIDER_SERVICE_ZIPS) {
    throw new ProviderSetupError(
      422,
      "TOO_MANY_SERVICE_AREA_ZIPS",
      `No more than ${MAX_PROVIDER_SERVICE_ZIPS} ZIP codes may be configured.`,
    );
  }
  const normalizedZipCodes: string[] = [];
  for (const value of body.zipCodes) {
    const zip = typeof value === "string" ? value.trim() : "";
    if (!/^\d{5}$/.test(zip)) {
      throw new ProviderSetupError(
        422,
        "INVALID_SERVICE_AREA_ZIP",
        "Each operating ZIP code must contain exactly five digits.",
        { invalidZipCode: value },
      );
    }
    if (!normalizedZipCodes.includes(zip)) normalizedZipCodes.push(zip);
  }
  if (!Number.isSafeInteger(body.maxTravelRadius)
      || Number(body.maxTravelRadius) < MIN_PROVIDER_TRAVEL_RADIUS
      || Number(body.maxTravelRadius) > MAX_PROVIDER_TRAVEL_RADIUS) {
    throw new ProviderSetupError(
      422,
      "INVALID_TRAVEL_RADIUS",
      `Travel radius must be a whole number from ${MIN_PROVIDER_TRAVEL_RADIUS} to ${MAX_PROVIDER_TRAVEL_RADIUS} miles.`,
    );
  }
  return {
    region,
    zipCodes: normalizedZipCodes,
    maxTravelRadius: Number(body.maxTravelRadius),
  };
}

export function validateTrainingNotes(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") {
    throw new ProviderSetupError(400, "INVALID_TRAINING_NOTES", "Training notes must be text.");
  }
  const notes = input.trim();
  if (notes.length > 2_000) {
    throw new ProviderSetupError(
      422,
      "TRAINING_NOTES_TOO_LONG",
      "Training notes must be 2,000 characters or fewer.",
    );
  }
  return notes || null;
}

export function hasApprovedVehicleVerification(media: ProviderApplicationMedia[]): boolean {
  return PROVIDER_APPLICATION_MEDIA_TYPES.every(mediaType => media.some(item =>
    item.mediaType === mediaType
    && item.isCurrent
    && !item.deletedAt
    && item.uploadStatus === "uploaded"
    && item.processingStatus === "ready"
    && item.reviewStatus === "approved"
  ));
}

export function activationBlockers(
  applicationStatus: string,
  setup: ProviderApplicationSetup | null | undefined,
  media: ProviderApplicationMedia[],
): ActivationBlocker[] {
  const blockers: ActivationBlocker[] = [];
  if (applicationStatus !== "approved_needs_setup" && applicationStatus !== "active_provider") {
    blockers.push("invalid_application_state");
  }
  if (!hasApprovedVehicleVerification(media)) {
    blockers.push("vehicle_verification_incomplete");
  }
  if (!setup
      || setup.serviceGuideVersion !== REQUIRED_SERVICE_GUIDE_VERSION
      || !setup.serviceGuideAcknowledgedAt) {
    blockers.push("service_guide_incomplete");
  }
  if (!setup
      || !setup.serviceAreaConfirmedAt
      || !setup.serviceAreaRegion?.trim()
      || !setup.serviceAreaZipCodes?.length
      || setup.serviceAreaZipCodes.some(zip => !/^\d{5}$/.test(zip))
      || setup.maxTravelRadius === null
      || setup.maxTravelRadius < MIN_PROVIDER_TRAVEL_RADIUS
      || setup.maxTravelRadius > MAX_PROVIDER_TRAVEL_RADIUS) {
    blockers.push("service_area_incomplete");
  }
  if (!setup?.trainingCompletedAt || !setup.trainingCompletedBy) {
    blockers.push("training_incomplete");
  }
  return blockers;
}
