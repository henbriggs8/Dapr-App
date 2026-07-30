import {
  PROVIDER_APPLICATION_MEDIA_TYPES,
  type ProviderApplicationMedia,
  type ProviderApplicationMediaType,
} from "@shared/schema";

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const MEDIA_UPLOAD_TTL_SECONDS = 15 * 60;
export const MEDIA_VIEW_TTL_SECONDS = 5 * 60;
export const REQUIRED_VEHICLE_MEDIA = [...PROVIDER_APPLICATION_MEDIA_TYPES];

const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime"]);

export class VerificationMediaError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "VerificationMediaError";
  }
}

export type InitiateMediaInput = {
  mediaType: ProviderApplicationMediaType;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256?: string;
};

export function validateInitiateMediaInput(input: unknown): InitiateMediaInput {
  if (!input || typeof input !== "object") {
    throw new VerificationMediaError(400, "INVALID_REQUEST", "A media upload request is required.");
  }
  const body = input as Record<string, unknown>;
  if (!PROVIDER_APPLICATION_MEDIA_TYPES.includes(body.mediaType as ProviderApplicationMediaType)) {
    throw new VerificationMediaError(400, "INVALID_MEDIA_TYPE", "mediaType must be trunk_photo, back_seat_photo, or walkaround_video.");
  }
  if (typeof body.mimeType !== "string") {
    throw new VerificationMediaError(400, "INVALID_MIME_TYPE", "mimeType is required.");
  }
  const mediaType = body.mediaType as ProviderApplicationMediaType;
  const mimeType = body.mimeType.toLowerCase().trim();
  const allowed = mediaType === "walkaround_video" ? VIDEO_MIME_TYPES : PHOTO_MIME_TYPES;
  if (!allowed.has(mimeType)) {
    throw new VerificationMediaError(415, "UNSUPPORTED_MEDIA_TYPE", `The declared MIME type is not accepted for ${mediaType}.`);
  }
  if (!Number.isSafeInteger(body.fileSizeBytes) || Number(body.fileSizeBytes) <= 0) {
    throw new VerificationMediaError(400, "INVALID_FILE_SIZE", "fileSizeBytes must be a positive integer.");
  }
  const fileSizeBytes = Number(body.fileSizeBytes);
  const maximum = mediaType === "walkaround_video" ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES;
  if (fileSizeBytes > maximum) {
    throw new VerificationMediaError(413, "FILE_TOO_LARGE", `The file exceeds the ${maximum} byte limit.`);
  }
  let checksumSha256: string | undefined;
  if (body.checksumSha256 !== undefined) {
    if (typeof body.checksumSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(body.checksumSha256)) {
      throw new VerificationMediaError(400, "INVALID_CHECKSUM", "checksumSha256 must be a 64-character hexadecimal SHA-256 digest.");
    }
    checksumSha256 = body.checksumSha256.toLowerCase();
  }
  return { mediaType, mimeType, fileSizeBytes, checksumSha256 };
}

export function assertApplicationOwner(application: { userId: number | null }, userId: number): void {
  if (application.userId !== userId) {
    throw new VerificationMediaError(403, "ACCESS_DENIED", "This provider application does not belong to the signed-in user.");
  }
}

export function providerApplicationAdminAccess(user: { isAdmin?: boolean } | null | undefined): 200 | 401 | 403 {
  if (!user) return 401;
  return user.isAdmin ? 200 : 403;
}

export function assertVerificationEditable(application: { applicationStatus: string }): void {
  if (application.applicationStatus !== "verification_requested") {
    throw new VerificationMediaError(409, "VERIFICATION_NOT_EDITABLE", "Vehicle verification can only be changed while verification is requested.");
  }
}

export function assertMediaBelongsToApplication(media: { applicationId: number }, applicationId: number): void {
  if (media.applicationId !== applicationId) {
    throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Verification media was not found.");
  }
}

export function assertValidReplacementTarget(
  media: Pick<ProviderApplicationMedia, "applicationId" | "mediaType" | "isCurrent" | "deletedAt">,
  applicationId: number,
  mediaType: ProviderApplicationMediaType,
): void {
  assertMediaBelongsToApplication(media, applicationId);
  if (!media.isCurrent || media.deletedAt || media.mediaType !== mediaType) {
    throw new VerificationMediaError(409, "INVALID_REPLACEMENT", "A replacement must target the current media item of the same type.");
  }
}

export function assertMediaSignature(mediaType: ProviderApplicationMediaType, mimeType: string, bytes: Buffer): void {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const brand = bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp"
    ? bytes.subarray(8, 12).toString("ascii")
    : "";
  const isHeif = ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  const isVideoContainer = ["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "qt  "].includes(brand);

  const valid = mimeType === "image/jpeg" ? isJpeg
    : mimeType === "image/png" ? isPng
    : mimeType === "image/heic" || mimeType === "image/heif" ? isHeif
    : mimeType === "video/mp4" || mimeType === "video/quicktime" ? isVideoContainer
    : false;
  if (!valid || (mediaType === "walkaround_video") !== VIDEO_MIME_TYPES.has(mimeType)) {
    throw new VerificationMediaError(415, "CONTENT_TYPE_MISMATCH", "The uploaded file signature does not match its declared media type.");
  }
}

export function assertVerificationComplete(media: ProviderApplicationMedia[]): void {
  const missing = REQUIRED_VEHICLE_MEDIA.filter(mediaType => !media.some(item =>
    item.mediaType === mediaType &&
    item.isCurrent &&
    !item.deletedAt &&
    item.uploadStatus === "uploaded" &&
    item.processingStatus === "ready" &&
    Boolean(item.checksumSha256)
  ));
  if (missing.length) {
    throw new VerificationMediaError(422, "INCOMPLETE_VERIFICATION", "All three required vehicle media items must be uploaded and ready.", { missing });
  }
}

export function mediaExtension(mediaType: ProviderApplicationMediaType, mimeType: string): string {
  if (mediaType === "walkaround_video") return mimeType === "video/quicktime" ? "mov" : "mp4";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  return "jpg";
}

export function canApproveVerification(media: ProviderApplicationMedia[]): boolean {
  return REQUIRED_VEHICLE_MEDIA.every(mediaType => media.some(item =>
    item.mediaType === mediaType && item.isCurrent && !item.deletedAt && item.reviewStatus === "approved"
  ));
}
