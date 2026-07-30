import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderApplicationMedia } from "@shared/schema";
import {
  PHOTO_MAX_BYTES,
  VIDEO_MAX_BYTES,
  VerificationMediaError,
  assertApplicationOwner,
  assertMediaSignature,
  assertValidReplacementTarget,
  assertVerificationComplete,
  assertVerificationEditable,
  canApproveVerification,
  providerApplicationAdminAccess,
  validateInitiateMediaInput,
} from "./provider-verification-policy";
import {
  createVerificationCapability,
  verifyVerificationCapability,
} from "./provider-verification-capability";
import { serializeSafeLogJson } from "./log-redaction";

const asMedia = (overrides: Partial<ProviderApplicationMedia>): ProviderApplicationMedia => ({
  id: 1,
  applicationId: 12,
  mediaType: "trunk_photo",
  objectKey: "private/key",
  mimeType: "image/jpeg",
  fileSizeBytes: 100,
  expectedChecksumSha256: null,
  checksumSha256: "a".repeat(64),
  uploadStatus: "uploaded",
  processingStatus: "ready",
  failureReason: null,
  version: 1,
  isCurrent: true,
  supersedesMediaId: null,
  reviewStatus: "pending",
  rejectionReason: null,
  uploadExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  uploadedAt: new Date().toISOString(),
  readyAt: new Date().toISOString(),
  reviewedAt: null,
  reviewedBy: null,
  supersededAt: null,
  deletedAt: null,
  objectDeletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

test("provider ownership and editable application state are enforced", () => {
  assert.doesNotThrow(() => assertApplicationOwner({ userId: 7 }, 7));
  assert.throws(() => assertApplicationOwner({ userId: 7 }, 8), (error: VerificationMediaError) => error.code === "ACCESS_DENIED");
  assert.doesNotThrow(() => assertVerificationEditable({ applicationStatus: "verification_requested" }));
  assert.throws(
    () => assertVerificationEditable({ applicationStatus: "verification_submitted" }),
    (error: VerificationMediaError) => error.code === "VERIFICATION_NOT_EDITABLE",
  );
});

test("admin authorization distinguishes unauthenticated and non-admin users", () => {
  assert.equal(providerApplicationAdminAccess(undefined), 401);
  assert.equal(providerApplicationAdminAccess({ isAdmin: false }), 403);
  assert.equal(providerApplicationAdminAccess({ isAdmin: true }), 200);
});

test("media type and maximum size rules are type-specific", () => {
  assert.equal(validateInitiateMediaInput({
    mediaType: "trunk_photo",
    mimeType: "image/jpeg",
    fileSizeBytes: PHOTO_MAX_BYTES,
  }).fileSizeBytes, PHOTO_MAX_BYTES);
  assert.equal(validateInitiateMediaInput({
    mediaType: "walkaround_video",
    mimeType: "video/mp4",
    fileSizeBytes: VIDEO_MAX_BYTES,
  }).fileSizeBytes, VIDEO_MAX_BYTES);
  assert.throws(
    () => validateInitiateMediaInput({ mediaType: "trunk_photo", mimeType: "video/mp4", fileSizeBytes: 10 }),
    (error: VerificationMediaError) => error.code === "UNSUPPORTED_MEDIA_TYPE",
  );
  assert.throws(
    () => validateInitiateMediaInput({ mediaType: "walkaround_video", mimeType: "video/mp4", fileSizeBytes: VIDEO_MAX_BYTES + 1 }),
    (error: VerificationMediaError) => error.code === "FILE_TOO_LARGE",
  );
});

test("declared MIME types must match file signatures", () => {
  assert.doesNotThrow(() => assertMediaSignature("trunk_photo", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00])));
  assert.doesNotThrow(() => assertMediaSignature("walkaround_video", "video/mp4", Buffer.from("0000ftypmp42", "ascii")));
  assert.throws(
    () => assertMediaSignature("trunk_photo", "image/jpeg", Buffer.from("0000ftypmp42", "ascii")),
    (error: VerificationMediaError) => error.code === "CONTENT_TYPE_MISMATCH",
  );
});

test("verification submission requires one ready current item of every required type", () => {
  const complete = [
    asMedia({ id: 1, mediaType: "trunk_photo" }),
    asMedia({ id: 2, mediaType: "back_seat_photo" }),
    asMedia({ id: 3, mediaType: "walkaround_video", mimeType: "video/mp4" }),
  ];
  assert.doesNotThrow(() => assertVerificationComplete(complete));
  assert.throws(
    () => assertVerificationComplete(complete.slice(0, 2)),
    (error: VerificationMediaError) => error.code === "INCOMPLETE_VERIFICATION",
  );
  assert.throws(
    () => assertVerificationComplete(complete.map(item => item.mediaType === "back_seat_photo" ? { ...item, isCurrent: false } : item)),
    (error: VerificationMediaError) => error.code === "INCOMPLETE_VERIFICATION",
  );
});

test("admin approval requires all three current media items to be individually approved", () => {
  const approved = [
    asMedia({ id: 1, mediaType: "trunk_photo", reviewStatus: "approved" }),
    asMedia({ id: 2, mediaType: "back_seat_photo", reviewStatus: "approved" }),
    asMedia({ id: 3, mediaType: "walkaround_video", mimeType: "video/mp4", reviewStatus: "approved" }),
  ];
  assert.equal(canApproveVerification(approved), true);
  assert.equal(canApproveVerification(approved.map(item => item.id === 2 ? { ...item, reviewStatus: "rejected" } : item)), false);
});

test("replacement targets must be the current item of the same type and application", () => {
  const current = asMedia({ applicationId: 12, mediaType: "trunk_photo", isCurrent: true });
  assert.doesNotThrow(() => assertValidReplacementTarget(current, 12, "trunk_photo"));
  assert.throws(
    () => assertValidReplacementTarget({ ...current, isCurrent: false }, 12, "trunk_photo"),
    (error: VerificationMediaError) => error.code === "INVALID_REPLACEMENT",
  );
  assert.throws(
    () => assertValidReplacementTarget(current, 99, "trunk_photo"),
    (error: VerificationMediaError) => error.code === "MEDIA_NOT_FOUND",
  );
});

test("upload and view capabilities expire and are bound to purpose, actor, application, and media", () => {
  const secret = "unit-test-secret-with-at-least-32-characters";
  const token = createVerificationCapability({
    purpose: "upload",
    applicationId: 12,
    mediaId: 3,
    actorId: 7,
    expiresAt: new Date("2026-07-29T12:15:00Z"),
  }, secret);
  assert.equal(verifyVerificationCapability(token, {
    purpose: "upload",
    applicationId: 12,
    mediaId: 3,
    actorId: 7,
  }, secret, new Date("2026-07-29T12:14:00Z")).mediaId, 3);
  assert.throws(
    () => verifyVerificationCapability(token, {
      purpose: "view",
      applicationId: 12,
      mediaId: 3,
      actorId: 7,
    }, secret, new Date("2026-07-29T12:14:00Z")),
    (error: VerificationMediaError) => error.code === "MEDIA_CAPABILITY_SCOPE_MISMATCH",
  );
  assert.throws(
    () => verifyVerificationCapability(token, {
      purpose: "upload",
      applicationId: 12,
      mediaId: 3,
      actorId: 7,
    }, secret, new Date("2026-07-29T12:15:00Z")),
    (error: VerificationMediaError) => error.code === "MEDIA_CAPABILITY_EXPIRED",
  );
});

test("capability-bearing URLs and sensitive fields are redacted before response logging", () => {
  const token = "sensitive-capability-token";
  const serialized = serializeSafeLogJson({
    url: `/api/media/view?token=${token}`,
    nested: { access_token: token, checksumSha256: token },
  });
  assert.equal(serialized.includes(token), false);
  assert.match(serialized, /token=\[REDACTED\]/);
  assert.match(serialized, /"access_token":"\[REDACTED\]"/);
});
