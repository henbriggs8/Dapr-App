import { createHash } from "node:crypto";
import { Transform, type TransformCallback } from "node:stream";
import type { Express, NextFunction, Request, Response } from "express";
import type { ProviderApplicationMedia, ProviderApplicationMediaType } from "@shared/schema";
import { resolveUserFromBearer } from "./clerk-middleware";
import {
  MEDIA_UPLOAD_TTL_SECONDS,
  MEDIA_VIEW_TTL_SECONDS,
  VerificationMediaError,
  assertApplicationOwner,
  assertMediaBelongsToApplication,
  assertMediaSignature,
  assertValidReplacementTarget,
  assertVerificationEditable,
  validateInitiateMediaInput,
} from "./provider-verification-policy";
import {
  createVerificationCapability,
  verifyVerificationCapability,
} from "./provider-verification-capability";
import { ProviderVerificationRepository } from "./provider-verification-repository";
import {
  ReplitVerificationMediaObjectStore,
  type VerificationMediaObjectStore,
} from "./verification-media-object-store";

type AdminMiddleware = (req: Request, res: Response, next: NextFunction) => unknown;

const repository = new ProviderVerificationRepository();
let objectStore: VerificationMediaObjectStore | undefined;

function getObjectStore(): VerificationMediaObjectStore {
  objectStore ??= new ReplitVerificationMediaObjectStore();
  return objectStore;
}

async function deleteStoredObject(media: ProviderApplicationMedia): Promise<void> {
  await getObjectStore().delete(media.objectKey);
  await repository.markObjectDeleted(media.id);
}

function signingSecret(): string {
  const value = process.env.VERIFICATION_MEDIA_TOKEN_SECRET ?? "";
  if (value.length < 32) {
    throw new VerificationMediaError(503, "MEDIA_NOT_CONFIGURED", "Vehicle verification signing is not configured.");
  }
  return value;
}

function parseId(raw: string, label: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new VerificationMediaError(400, "INVALID_ID", `${label} must be a positive integer.`);
  }
  return id;
}

function mediaResponse(media: ProviderApplicationMedia, admin = false) {
  const {
    objectKey,
    expectedChecksumSha256,
    ...safe
  } = media;
  if (admin) return { ...safe, checksumSha256: media.checksumSha256 };
  return safe;
}

function routeError(res: Response, error: unknown) {
  if (error instanceof VerificationMediaError) {
    return res.status(error.status).json({
      code: error.code,
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
  }
  console.error("[provider-verification] route error:", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", error: "Vehicle verification could not be completed." });
}

class ValidatingUploadStream extends Transform {
  private readonly hash = createHash("sha256");
  private signatureBytes = Buffer.alloc(0);
  private receivedBytes = 0;

  constructor(
    private readonly media: ProviderApplicationMedia,
  ) {
    super();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    this.receivedBytes += chunk.length;
    if (this.receivedBytes > this.media.fileSizeBytes) {
      callback(new VerificationMediaError(413, "FILE_TOO_LARGE", "The upload exceeded its declared size."));
      return;
    }
    if (this.signatureBytes.length < 32) {
      this.signatureBytes = Buffer.concat([this.signatureBytes, chunk]).subarray(0, 32);
    }
    this.hash.update(chunk);
    callback(null, chunk);
  }

  _flush(callback: TransformCallback) {
    try {
      if (this.receivedBytes !== this.media.fileSizeBytes) {
        throw new VerificationMediaError(400, "FILE_SIZE_MISMATCH", "The uploaded byte count does not match fileSizeBytes.");
      }
      assertMediaSignature(
        this.media.mediaType as ProviderApplicationMediaType,
        this.media.mimeType,
        this.signatureBytes,
      );
      const digest = this.hash.digest("hex");
      if (this.media.expectedChecksumSha256 && digest !== this.media.expectedChecksumSha256) {
        throw new VerificationMediaError(422, "CHECKSUM_MISMATCH", "The uploaded file checksum does not match checksumSha256.");
      }
      this.emit("verified", digest);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

async function ownedEditableApplication(applicationId: number, userId: number) {
  const application = await repository.getApplication(applicationId);
  if (!application) throw new VerificationMediaError(404, "APPLICATION_NOT_FOUND", "Provider application was not found.");
  assertApplicationOwner(application, userId);
  assertVerificationEditable(application);
  return application;
}

async function createUpload(applicationId: number, userId: number, input: unknown, replacingMediaId?: number) {
  await ownedEditableApplication(applicationId, userId);
  const parsed = validateInitiateMediaInput(input);
  if (replacingMediaId !== undefined) {
    const replacing = await repository.getMedia(replacingMediaId);
    if (!replacing) throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Verification media was not found.");
    assertValidReplacementTarget(replacing, applicationId, parsed.mediaType);
  }
  const expiresAt = new Date(Date.now() + MEDIA_UPLOAD_TTL_SECONDS * 1000);
  const media = await repository.createPendingMedia(applicationId, {
    ...parsed,
    expectedChecksumSha256: parsed.checksumSha256,
    uploadExpiresAt: expiresAt.toISOString(),
  });
  const token = createVerificationCapability({
    purpose: "upload",
    applicationId,
    mediaId: media.id,
    actorId: userId,
    expiresAt,
  }, signingSecret());
  const uploadUrl = `/api/provider-applications/${applicationId}/vehicle-verification/uploads/${media.id}?token=${encodeURIComponent(token)}`;
  return {
    media: mediaResponse(media),
    upload: {
      method: "PUT",
      url: uploadUrl,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(media.fileSizeBytes),
      },
      expiresAt: expiresAt.toISOString(),
    },
  };
}

export function registerProviderVerificationRoutes(app: Express, requireAdmin: AdminMiddleware): void {
  app.post("/api/provider-applications/:id/vehicle-verification/uploads", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    try {
      const result = await createUpload(parseId(req.params.id, "Application ID"), req.user.id, req.body);
      return res.status(201).json(result);
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.post("/api/provider-applications/:id/vehicle-verification/media/:mediaId/replacements", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    try {
      const result = await createUpload(
        parseId(req.params.id, "Application ID"),
        req.user.id,
        req.body,
        parseId(req.params.mediaId, "Media ID"),
      );
      return res.status(201).json(result);
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.put("/api/provider-applications/:id/vehicle-verification/uploads/:mediaId", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    let media: ProviderApplicationMedia | undefined;
    let uploadStarted = false;
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const mediaId = parseId(req.params.mediaId, "Media ID");
      await ownedEditableApplication(applicationId, req.user.id);
      media = await repository.getMedia(mediaId);
      if (!media) throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Verification media was not found.");
      assertMediaBelongsToApplication(media, applicationId);
      if (media.uploadStatus !== "pending" || media.deletedAt) {
        throw new VerificationMediaError(409, "UPLOAD_NOT_PENDING", "This upload is no longer pending.");
      }
      if (new Date(media.uploadExpiresAt).getTime() <= Date.now()) {
        throw new VerificationMediaError(410, "UPLOAD_EXPIRED", "This upload has expired. Initiate a new upload.");
      }
      const token = typeof req.query.token === "string" ? req.query.token : "";
      verifyVerificationCapability(token, {
        purpose: "upload",
        applicationId,
        mediaId,
        actorId: req.user.id,
      }, signingSecret());
      if (req.get("content-type")?.split(";")[0].trim().toLowerCase() !== media.mimeType) {
        throw new VerificationMediaError(415, "CONTENT_TYPE_MISMATCH", "Content-Type must match the initiated upload.");
      }
      if (Number(req.get("content-length")) !== media.fileSizeBytes) {
        throw new VerificationMediaError(400, "FILE_SIZE_MISMATCH", "Content-Length must match fileSizeBytes.");
      }
      media = await repository.markUploading(mediaId);
      uploadStarted = true;
      const validatingStream = new ValidatingUploadStream(media);
      let checksumSha256 = "";
      validatingStream.once("verified", digest => { checksumSha256 = String(digest); });
      const validationFailure = new Promise<never>((_resolve, reject) => {
        validatingStream.once("error", reject);
      });
      const storageUpload = getObjectStore().upload(media.objectKey, validatingStream);
      req.pipe(validatingStream);
      await Promise.race([storageUpload, validationFailure]);
      const uploaded = await repository.markUploadSucceeded(media.id, checksumSha256);
      return res.json({ uploaded: true, media: mediaResponse(uploaded) });
    } catch (error) {
      if (media && uploadStarted) {
        await deleteStoredObject(media).catch(cleanupError =>
          console.error("[provider-verification] failed upload cleanup:", cleanupError));
        await repository.markUploadFailed(media.id, error instanceof Error ? error.message : "Upload failed.").catch(() => undefined);
      }
      return routeError(res, error);
    }
  });

  app.post("/api/provider-applications/:id/vehicle-verification/uploads/:mediaId/complete", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const mediaId = parseId(req.params.mediaId, "Media ID");
      await ownedEditableApplication(applicationId, req.user.id);
      const media = await repository.getMedia(mediaId);
      if (!media) throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Verification media was not found.");
      assertMediaBelongsToApplication(media, applicationId);
      if (media.uploadStatus !== "uploaded" || !media.checksumSha256) {
        throw new VerificationMediaError(409, "UPLOAD_INCOMPLETE", "The media upload has not completed.");
      }
      if (!await getObjectStore().exists(media.objectKey)) {
        throw new VerificationMediaError(409, "OBJECT_NOT_FOUND", "The uploaded object could not be verified.");
      }
      const ready = await repository.promoteReady(mediaId);
      return res.json({ completed: true, media: mediaResponse(ready) });
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.get("/api/provider-applications/:id/vehicle-verification/media", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const application = await repository.getApplication(applicationId);
      if (!application) throw new VerificationMediaError(404, "APPLICATION_NOT_FOUND", "Provider application was not found.");
      assertApplicationOwner(application, req.user.id);
      const media = await repository.listMedia(applicationId);
      return res.json({ applicationId, applicationStatus: application.applicationStatus, media: media.map(item => mediaResponse(item)) });
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.delete("/api/provider-applications/:id/vehicle-verification/media/:mediaId", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const mediaId = parseId(req.params.mediaId, "Media ID");
      await ownedEditableApplication(applicationId, req.user.id);
      const media = await repository.getMedia(mediaId);
      if (!media || media.deletedAt) throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Verification media was not found.");
      assertMediaBelongsToApplication(media, applicationId);
      await repository.softDeleteMedia(mediaId);
      await deleteStoredObject(media).catch(cleanupError =>
        console.error("[provider-verification] deferred delete cleanup:", cleanupError));
      return res.status(204).end();
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.post("/api/provider-applications/:id/vehicle-verification/submit", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      await ownedEditableApplication(applicationId, req.user.id);
      const result = await repository.submitVerification(applicationId);
      return res.json({
        submitted: true,
        application: result.application,
        media: result.media.map(item => mediaResponse(item)),
      });
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.get("/api/admin/provider-applications/:id/vehicle-verification/media", requireAdmin, async (req, res) => {
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const application = await repository.getApplication(applicationId);
      if (!application) throw new VerificationMediaError(404, "APPLICATION_NOT_FOUND", "Provider application was not found.");
      const media = await repository.listMedia(applicationId);
      return res.json({ applicationId, applicationStatus: application.applicationStatus, media: media.map(item => mediaResponse(item, true)) });
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.post("/api/admin/provider-applications/:id/vehicle-verification/media/:mediaId/view-url", requireAdmin, async (req, res) => {
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const mediaId = parseId(req.params.mediaId, "Media ID");
      const media = await repository.getMedia(mediaId);
      if (!media || media.deletedAt || !media.isCurrent || media.processingStatus !== "ready") {
        throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Reviewable media was not found.");
      }
      assertMediaBelongsToApplication(media, applicationId);
      const expiresAt = new Date(Date.now() + MEDIA_VIEW_TTL_SECONDS * 1000);
      const token = createVerificationCapability({
        purpose: "view",
        applicationId,
        mediaId,
        actorId: req.user!.id,
        expiresAt,
      }, signingSecret());
      return res.json({
        url: `/api/admin/provider-applications/${applicationId}/vehicle-verification/media/${mediaId}/view?token=${encodeURIComponent(token)}`,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.get("/api/admin/provider-applications/:id/vehicle-verification/media/:mediaId/view", requireAdmin, async (req, res) => {
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const mediaId = parseId(req.params.mediaId, "Media ID");
      const media = await repository.getMedia(mediaId);
      if (!media || media.deletedAt || !media.isCurrent || media.processingStatus !== "ready") {
        throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Reviewable media was not found.");
      }
      assertMediaBelongsToApplication(media, applicationId);
      verifyVerificationCapability(typeof req.query.token === "string" ? req.query.token : "", {
        purpose: "view",
        applicationId,
        mediaId,
        actorId: req.user!.id,
      }, signingSecret());
      res.status(200);
      res.setHeader("Content-Type", media.mimeType);
      res.setHeader("Content-Length", String(media.fileSizeBytes));
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; media-src 'self'; img-src 'self'");
      res.setHeader("Accept-Ranges", "none");
      const stream = getObjectStore().download(media.objectKey);
      stream.once("error", error => {
        console.error("[provider-verification] view stream error:", error);
        if (!res.headersSent) routeError(res, error);
        else res.destroy(error as Error);
      });
      stream.pipe(res);
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.patch("/api/admin/provider-applications/:id/vehicle-verification/media/:mediaId/review", requireAdmin, async (req, res) => {
    try {
      const applicationId = parseId(req.params.id, "Application ID");
      const mediaId = parseId(req.params.mediaId, "Media ID");
      const application = await repository.getApplication(applicationId);
      if (!application) throw new VerificationMediaError(404, "APPLICATION_NOT_FOUND", "Provider application was not found.");
      if (application.applicationStatus !== "verification_submitted") {
        throw new VerificationMediaError(409, "VERIFICATION_NOT_REVIEWABLE", "Media can only be reviewed after verification is submitted.");
      }
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (!["approved", "rejected", "replacement_requested"].includes(status)) {
        throw new VerificationMediaError(400, "INVALID_REVIEW_STATUS", "status must be approved, rejected, or replacement_requested.");
      }
      if ((status === "rejected" || status === "replacement_requested") && !reason) {
        throw new VerificationMediaError(400, "REVIEW_REASON_REQUIRED", "A reason is required for rejection or replacement.");
      }
      const media = await repository.getMedia(mediaId);
      if (!media || !media.isCurrent || media.deletedAt || media.processingStatus !== "ready") {
        throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Reviewable media was not found.");
      }
      assertMediaBelongsToApplication(media, applicationId);
      if (status === "replacement_requested") {
        const result = await repository.reviewAndRequestReplacement(
          applicationId,
          mediaId,
          req.user!.id,
          reason,
        );
        return res.json({ media: mediaResponse(result.media, true), application: result.application });
      }
      const reviewed = await repository.reviewMedia(mediaId, req.user!.id, status, reason || null);
      return res.json({ media: mediaResponse(reviewed, true), application });
    } catch (error) {
      return routeError(res, error);
    }
  });
}

export async function approveVehicleVerification(
  applicationId: number,
  adminId: number,
  internalReviewNotes?: string,
) {
  return repository.approveVerification(applicationId, adminId, internalReviewNotes);
}
