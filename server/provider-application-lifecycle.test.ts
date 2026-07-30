import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_ALLOWED_TRANSITIONS,
  requiresGuardedVehicleVerificationApproval,
  type ProviderApplicationMedia,
} from "@shared/schema";
import { canApproveVerification } from "./provider-verification-policy";

const asMedia = (
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
  uploadExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  uploadedAt: new Date().toISOString(),
  readyAt: new Date().toISOString(),
  reviewedAt: new Date().toISOString(),
  reviewedBy: 7,
  supersededAt: null,
  deletedAt: null,
  objectDeletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const approvedMedia = [
  asMedia(1, "trunk_photo"),
  asMedia(2, "back_seat_photo"),
  asMedia(3, "walkaround_video"),
];

test("under-review applications cannot bypass vehicle verification", () => {
  assert.equal(
    ADMIN_ALLOWED_TRANSITIONS.under_review.includes("approved_needs_setup"),
    false,
  );
  assert.equal(
    ADMIN_ALLOWED_TRANSITIONS.under_review.includes("verification_requested"),
    true,
  );
});

test("every approved-needs-setup target requires the guarded approval path", () => {
  assert.equal(requiresGuardedVehicleVerificationApproval("approved_needs_setup"), true);
  assert.equal(requiresGuardedVehicleVerificationApproval("verification_requested"), false);
  assert.equal(requiresGuardedVehicleVerificationApproval("rejected"), false);
});

test("verification-submitted approval fails while media review is incomplete", () => {
  assert.equal(
    ADMIN_ALLOWED_TRANSITIONS.verification_submitted.includes("approved_needs_setup"),
    true,
  );
  assert.equal(canApproveVerification(approvedMedia.slice(0, 2)), false);
  assert.equal(
    canApproveVerification(
      approvedMedia.map(media =>
        media.mediaType === "back_seat_photo"
          ? { ...media, reviewStatus: "pending" }
          : media,
      ),
    ),
    false,
  );
});

test("verification-submitted approval succeeds only with all three current approved media", () => {
  assert.equal(canApproveVerification(approvedMedia), true);
  assert.equal(
    canApproveVerification(
      approvedMedia.map(media =>
        media.mediaType === "walkaround_video"
          ? { ...media, isCurrent: false }
          : media,
      ),
    ),
    false,
  );
});
