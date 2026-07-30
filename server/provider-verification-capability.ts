import { createHmac, timingSafeEqual } from "node:crypto";
import { VerificationMediaError } from "./provider-verification-policy";

export type VerificationCapabilityPurpose = "upload" | "view";

type CapabilityPayload = {
  purpose: VerificationCapabilityPurpose;
  applicationId: number;
  mediaId: number;
  actorId: number;
  expiresAt: number;
};

function encodedSignature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createVerificationCapability(
  payload: Omit<CapabilityPayload, "expiresAt"> & { expiresAt: Date },
  secret: string,
): string {
  if (secret.length < 32) {
    throw new VerificationMediaError(503, "MEDIA_NOT_CONFIGURED", "Vehicle verification signing is not configured.");
  }
  const encodedPayload = Buffer.from(JSON.stringify({
    ...payload,
    expiresAt: Math.floor(payload.expiresAt.getTime() / 1000),
  })).toString("base64url");
  return `${encodedPayload}.${encodedSignature(encodedPayload, secret)}`;
}

export function verifyVerificationCapability(
  token: string,
  expected: Omit<CapabilityPayload, "expiresAt">,
  secret: string,
  now = new Date(),
): CapabilityPayload {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) {
    throw new VerificationMediaError(401, "INVALID_MEDIA_CAPABILITY", "The media capability is invalid.");
  }
  const expectedSignature = encodedSignature(encodedPayload, secret);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw new VerificationMediaError(401, "INVALID_MEDIA_CAPABILITY", "The media capability is invalid.");
  }
  let payload: CapabilityPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new VerificationMediaError(401, "INVALID_MEDIA_CAPABILITY", "The media capability is invalid.");
  }
  if (
    payload.purpose !== expected.purpose ||
    payload.applicationId !== expected.applicationId ||
    payload.mediaId !== expected.mediaId ||
    payload.actorId !== expected.actorId
  ) {
    throw new VerificationMediaError(403, "MEDIA_CAPABILITY_SCOPE_MISMATCH", "The media capability does not authorize this operation.");
  }
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Math.floor(now.getTime() / 1000)) {
    throw new VerificationMediaError(401, "MEDIA_CAPABILITY_EXPIRED", "The media capability has expired.");
  }
  return payload;
}
