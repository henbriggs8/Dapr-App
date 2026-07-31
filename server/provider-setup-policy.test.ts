import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_ALLOWED_TRANSITIONS,
  type ProviderApplicationMedia,
  type ProviderApplicationSetup,
} from "@shared/schema";
import {
  ProviderSetupError,
  REQUIRED_SERVICE_GUIDE_VERSION,
  activationBlockers,
  assertSetupAccessible,
  assertSetupOwner,
  hasApprovedVehicleVerification,
  validateServiceArea,
  validateServiceGuideAcknowledgement,
} from "./provider-setup-policy";
import { providerApplicationAdminAccess } from "./provider-verification-policy";

const now = "2026-07-30T20:00:00.000Z";

const completeSetup = (overrides: Partial<ProviderApplicationSetup> = {}): ProviderApplicationSetup => ({
  id: 1,
  applicationId: 42,
  userId: 7,
  serviceGuideVersion: REQUIRED_SERVICE_GUIDE_VERSION,
  serviceGuideAcknowledgedAt: now,
  serviceAreaRegion: "Phoenix Metro",
  serviceAreaZipCodes: ["85001", "85234"],
  maxTravelRadius: 20,
  serviceAreaConfirmedAt: now,
  trainingCompletedAt: now,
  trainingCompletedBy: 99,
  trainingNotes: null,
  activatedAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const media = (
  id: number,
  mediaType: ProviderApplicationMedia["mediaType"],
  overrides: Partial<ProviderApplicationMedia> = {},
): ProviderApplicationMedia => ({
  id,
  applicationId: 42,
  mediaType,
  objectKey: `private/test/${mediaType}`,
  mimeType: mediaType === "walkaround_video" ? "video/mp4" : "image/jpeg",
  fileSizeBytes: 100,
  expectedChecksumSha256: null,
  checksumSha256: "a".repeat(64),
  uploadStatus: "uploaded",
  processingStatus: "ready",
  failureReason: null,
  version: 1,
  isCurrent: true,
  supersedesMediaId: null,
  reviewStatus: "approved",
  rejectionReason: null,
  uploadExpiresAt: now,
  uploadedAt: now,
  readyAt: now,
  reviewedAt: now,
  reviewedBy: 99,
  supersededAt: null,
  deletedAt: null,
  objectDeletedAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const approvedMedia = [
  media(1, "trunk_photo"),
  media(2, "back_seat_photo"),
  media(3, "walkaround_video"),
];

test("provider setup enforces application ownership and valid setup states", () => {
  assert.doesNotThrow(() => assertSetupOwner({ userId: 7 }, 7));
  assert.throws(
    () => assertSetupOwner({ userId: 7 }, 8),
    (error: ProviderSetupError) => error.code === "ACCESS_DENIED",
  );
  assert.doesNotThrow(() => assertSetupAccessible({ applicationStatus: "approved_needs_setup" }));
  assert.doesNotThrow(() => assertSetupAccessible({ applicationStatus: "active_provider" }));
  for (const applicationStatus of ["draft", "submitted", "under_review", "verification_requested", "verification_submitted", "rejected", "withdrawn"]) {
    assert.throws(
      () => assertSetupAccessible({ applicationStatus }),
      (error: ProviderSetupError) => error.code === "SETUP_NOT_AVAILABLE",
    );
  }
});

test("admin authorization is required for setup administration", () => {
  assert.equal(providerApplicationAdminAccess(undefined), 401);
  assert.equal(providerApplicationAdminAccess({ isAdmin: false }), 403);
  assert.equal(providerApplicationAdminAccess({ isAdmin: true }), 200);
});

test("only the current service-guide version can be acknowledged", () => {
  assert.equal(
    validateServiceGuideAcknowledgement({ version: ` ${REQUIRED_SERVICE_GUIDE_VERSION} ` }),
    REQUIRED_SERVICE_GUIDE_VERSION,
  );
  assert.throws(
    () => validateServiceGuideAcknowledgement({ version: "0.9" }),
    (error: ProviderSetupError) => error.code === "SERVICE_GUIDE_VERSION_MISMATCH",
  );
  assert.throws(
    () => validateServiceGuideAcknowledgement({}),
    (error: ProviderSetupError) => error.code === "SERVICE_GUIDE_VERSION_MISMATCH",
  );
});

test("service-area input is normalized and duplicate ZIP codes are removed", () => {
  assert.deepEqual(validateServiceArea({
    region: "  Phoenix   Metro  ",
    zipCodes: [" 85234 ", "85001", "85234"],
    maxTravelRadius: 20,
  }), {
    region: "Phoenix Metro",
    zipCodes: ["85234", "85001"],
    maxTravelRadius: 20,
  });
});

test("service area rejects empty or malformed ZIPs and out-of-range radii", () => {
  assert.throws(
    () => validateServiceArea({ region: "Phoenix", zipCodes: [], maxTravelRadius: 20 }),
    (error: ProviderSetupError) => error.code === "SERVICE_AREA_ZIPS_REQUIRED",
  );
  for (const invalidZip of ["8523", "85234-1234", "ABCDE", ""]) {
    assert.throws(
      () => validateServiceArea({ region: "Phoenix", zipCodes: [invalidZip], maxTravelRadius: 20 }),
      (error: ProviderSetupError) => error.code === "INVALID_SERVICE_AREA_ZIP",
    );
  }
  for (const invalidRadius of [4, 51, 10.5, "20"]) {
    assert.throws(
      () => validateServiceArea({ region: "Phoenix", zipCodes: ["85234"], maxTravelRadius: invalidRadius }),
      (error: ProviderSetupError) => error.code === "INVALID_TRAVEL_RADIUS",
    );
  }
});

test("all three current media records must remain uploaded, ready, and approved", () => {
  assert.equal(hasApprovedVehicleVerification(approvedMedia), true);
  assert.equal(hasApprovedVehicleVerification(approvedMedia.slice(0, 2)), false);
  for (const overrides of [
    { isCurrent: false },
    { uploadStatus: "failed" },
    { processingStatus: "failed" },
    { reviewStatus: "pending" },
    { deletedAt: now },
  ]) {
    const changed = approvedMedia.map(item =>
      item.mediaType === "back_seat_photo" ? { ...item, ...overrides } : item
    );
    assert.equal(hasApprovedVehicleVerification(changed), false);
  }
});

test("every incomplete setup step prevents activation", () => {
  assert.deepEqual(activationBlockers("approved_needs_setup", completeSetup(), approvedMedia), []);
  assert.ok(activationBlockers("under_review", completeSetup(), approvedMedia).includes("invalid_application_state"));
  assert.ok(activationBlockers("approved_needs_setup", null, approvedMedia).includes("service_guide_incomplete"));
  assert.ok(activationBlockers("approved_needs_setup", completeSetup({
    serviceGuideVersion: null,
    serviceGuideAcknowledgedAt: null,
  }), approvedMedia).includes("service_guide_incomplete"));
  assert.ok(activationBlockers("approved_needs_setup", completeSetup({
    serviceAreaConfirmedAt: null,
  }), approvedMedia).includes("service_area_incomplete"));
  assert.ok(activationBlockers("approved_needs_setup", completeSetup({
    trainingCompletedAt: null,
    trainingCompletedBy: null,
  }), approvedMedia).includes("training_incomplete"));
  assert.ok(activationBlockers("approved_needs_setup", completeSetup(), approvedMedia.slice(0, 2))
    .includes("vehicle_verification_incomplete"));
});

test("notification permission is not part of Phase B1 activation eligibility", () => {
  assert.deepEqual(activationBlockers("approved_needs_setup", completeSetup(), approvedMedia), []);
});

test("direct active-provider status requests remain unavailable", () => {
  assert.equal(
    Object.values(ADMIN_ALLOWED_TRANSITIONS).some(transitions => transitions.includes("active_provider")),
    false,
  );
});
