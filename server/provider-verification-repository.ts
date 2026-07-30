import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lt, ne, sql } from "drizzle-orm";
import {
  providerApplicationMedia,
  providerApplications,
  type ProviderApplication,
  type ProviderApplicationMedia,
  type ProviderApplicationMediaType,
} from "@shared/schema";
import { db } from "./db";
import {
  VerificationMediaError,
  assertVerificationComplete,
  canApproveVerification,
  mediaExtension,
} from "./provider-verification-policy";

export type PendingMediaInput = {
  mediaType: ProviderApplicationMediaType;
  mimeType: string;
  fileSizeBytes: number;
  expectedChecksumSha256?: string;
  uploadExpiresAt: string;
};

function storageEnvironment(): string {
  const configured = process.env.VERIFICATION_MEDIA_ENVIRONMENT?.trim();
  if (configured && /^[a-z0-9_-]{1,32}$/i.test(configured)) return configured.toLowerCase();
  return process.env.REPLIT_DEPLOYMENT ? "production" : "development";
}

export class ProviderVerificationRepository {
  async getApplication(id: number): Promise<ProviderApplication | undefined> {
    const [application] = await db.select().from(providerApplications)
      .where(eq(providerApplications.id, id))
      .limit(1);
    return application;
  }

  async getMedia(id: number): Promise<ProviderApplicationMedia | undefined> {
    const [media] = await db.select().from(providerApplicationMedia)
      .where(eq(providerApplicationMedia.id, id))
      .limit(1);
    return media;
  }

  listMedia(applicationId: number): Promise<ProviderApplicationMedia[]> {
    return db.select().from(providerApplicationMedia)
      .where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        isNull(providerApplicationMedia.deletedAt),
      ))
      .orderBy(providerApplicationMedia.mediaType, desc(providerApplicationMedia.version));
  }

  listCurrentMedia(applicationId: number): Promise<ProviderApplicationMedia[]> {
    return db.select().from(providerApplicationMedia)
      .where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.isCurrent, true),
        isNull(providerApplicationMedia.deletedAt),
      ))
      .orderBy(providerApplicationMedia.mediaType);
  }

  async createPendingMedia(applicationId: number, input: PendingMediaInput): Promise<ProviderApplicationMedia> {
    return db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM provider_applications WHERE id = ${applicationId} FOR UPDATE`);
      const [versionRow] = await tx.select({
        value: sql<number>`COALESCE(MAX(${providerApplicationMedia.version}), 0)`,
      }).from(providerApplicationMedia).where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.mediaType, input.mediaType),
      ));
      const version = Number(versionRow?.value ?? 0) + 1;
      const [current] = await tx.select().from(providerApplicationMedia).where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.mediaType, input.mediaType),
        eq(providerApplicationMedia.isCurrent, true),
        isNull(providerApplicationMedia.deletedAt),
      )).limit(1);
      const now = new Date().toISOString();
      await tx.update(providerApplicationMedia).set({
        uploadStatus: "abandoned",
        failureReason: "Superseded by a newer upload request.",
        updatedAt: now,
      }).where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.mediaType, input.mediaType),
        eq(providerApplicationMedia.isCurrent, false),
        eq(providerApplicationMedia.uploadStatus, "pending"),
        isNull(providerApplicationMedia.deletedAt),
      ));
      const extension = mediaExtension(input.mediaType, input.mimeType);
      const objectKey = `${storageEnvironment()}/provider-applications/${applicationId}/vehicle-verification/${input.mediaType}/v${version}/${randomUUID()}.${extension}`;
      const [created] = await tx.insert(providerApplicationMedia).values({
        applicationId,
        mediaType: input.mediaType,
        objectKey,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        expectedChecksumSha256: input.expectedChecksumSha256 ?? null,
        uploadStatus: "pending",
        processingStatus: "pending",
        version,
        isCurrent: false,
        supersedesMediaId: current?.id ?? null,
        reviewStatus: "pending",
        uploadExpiresAt: input.uploadExpiresAt,
        createdAt: now,
        updatedAt: now,
      }).returning();
      return created;
    });
  }

  async markUploading(id: number): Promise<ProviderApplicationMedia> {
    const [updated] = await db.update(providerApplicationMedia).set({
      uploadStatus: "uploading",
      failureReason: null,
      updatedAt: new Date().toISOString(),
    }).where(and(
      eq(providerApplicationMedia.id, id),
      eq(providerApplicationMedia.uploadStatus, "pending"),
      isNull(providerApplicationMedia.deletedAt),
    )).returning();
    if (!updated) throw new Error("Media is not pending.");
    return updated;
  }

  async markUploadSucceeded(id: number, checksumSha256: string): Promise<ProviderApplicationMedia> {
    const now = new Date().toISOString();
    const [updated] = await db.update(providerApplicationMedia).set({
      uploadStatus: "uploaded",
      checksumSha256,
      uploadedAt: now,
      failureReason: null,
      updatedAt: now,
    }).where(and(
      eq(providerApplicationMedia.id, id),
      eq(providerApplicationMedia.uploadStatus, "uploading"),
      isNull(providerApplicationMedia.deletedAt),
    )).returning();
    if (!updated) throw new Error("Media upload state changed.");
    return updated;
  }

  async markUploadFailed(id: number, reason: string): Promise<void> {
    await db.update(providerApplicationMedia).set({
      uploadStatus: "failed",
      processingStatus: "failed",
      failureReason: reason.slice(0, 500),
      updatedAt: new Date().toISOString(),
    }).where(eq(providerApplicationMedia.id, id));
  }

  async promoteReady(id: number): Promise<ProviderApplicationMedia> {
    return db.transaction(async tx => {
      const [media] = await tx.select().from(providerApplicationMedia)
        .where(eq(providerApplicationMedia.id, id))
        .for("update")
        .limit(1);
      if (!media || media.deletedAt || media.uploadStatus !== "uploaded") {
        throw new Error("Uploaded media was not found.");
      }
      await tx.execute(sql`SELECT id FROM provider_applications WHERE id = ${media.applicationId} FOR UPDATE`);
      const now = new Date().toISOString();
      await tx.update(providerApplicationMedia).set({
        isCurrent: false,
        supersededAt: now,
        updatedAt: now,
      }).where(and(
        eq(providerApplicationMedia.applicationId, media.applicationId),
        eq(providerApplicationMedia.mediaType, media.mediaType),
        eq(providerApplicationMedia.isCurrent, true),
        ne(providerApplicationMedia.id, id),
        isNull(providerApplicationMedia.deletedAt),
      ));
      const [updated] = await tx.update(providerApplicationMedia).set({
        processingStatus: "ready",
        isCurrent: true,
        reviewStatus: "pending",
        rejectionReason: null,
        readyAt: now,
        updatedAt: now,
      }).where(eq(providerApplicationMedia.id, id)).returning();
      return updated;
    });
  }

  async softDeleteMedia(id: number): Promise<ProviderApplicationMedia | undefined> {
    const now = new Date().toISOString();
    const [updated] = await db.update(providerApplicationMedia).set({
      isCurrent: false,
      deletedAt: now,
      updatedAt: now,
    }).where(and(eq(providerApplicationMedia.id, id), isNull(providerApplicationMedia.deletedAt))).returning();
    return updated;
  }

  async reviewMedia(id: number, adminId: number, status: string, reason: string | null): Promise<ProviderApplicationMedia> {
    const now = new Date().toISOString();
    const [updated] = await db.update(providerApplicationMedia).set({
      reviewStatus: status,
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: adminId,
      updatedAt: now,
    }).where(and(
      eq(providerApplicationMedia.id, id),
      eq(providerApplicationMedia.isCurrent, true),
      isNull(providerApplicationMedia.deletedAt),
    )).returning();
    if (!updated) throw new Error("Current media was not found.");
    return updated;
  }

  async reviewAndRequestReplacement(
    applicationId: number,
    mediaId: number,
    adminId: number,
    reason: string,
  ): Promise<{ media: ProviderApplicationMedia; application: ProviderApplication }> {
    return db.transaction(async tx => {
      const [application] = await tx.select().from(providerApplications)
        .where(eq(providerApplications.id, applicationId))
        .for("update")
        .limit(1);
      if (!application || application.applicationStatus !== "verification_submitted") {
        throw new VerificationMediaError(409, "VERIFICATION_NOT_REVIEWABLE", "Media can only be reviewed after verification is submitted.");
      }
      const now = new Date().toISOString();
      const [media] = await tx.update(providerApplicationMedia).set({
        reviewStatus: "replacement_requested",
        rejectionReason: reason,
        reviewedAt: now,
        reviewedBy: adminId,
        updatedAt: now,
      }).where(and(
        eq(providerApplicationMedia.id, mediaId),
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.isCurrent, true),
        eq(providerApplicationMedia.processingStatus, "ready"),
        isNull(providerApplicationMedia.deletedAt),
      )).returning();
      if (!media) throw new VerificationMediaError(404, "MEDIA_NOT_FOUND", "Reviewable media was not found.");
      const [updatedApplication] = await tx.update(providerApplications).set({
        applicationStatus: "verification_requested",
        reviewedAt: now,
        reviewedBy: adminId,
        updatedAt: now,
      }).where(eq(providerApplications.id, applicationId)).returning();
      return { media, application: updatedApplication };
    });
  }

  async submitVerification(applicationId: number): Promise<{ application: ProviderApplication; media: ProviderApplicationMedia[] }> {
    return db.transaction(async tx => {
      const [application] = await tx.select().from(providerApplications)
        .where(eq(providerApplications.id, applicationId))
        .for("update")
        .limit(1);
      if (!application || application.applicationStatus !== "verification_requested") {
        throw new VerificationMediaError(409, "VERIFICATION_NOT_EDITABLE", "Vehicle verification is not ready to submit.");
      }
      const media = await tx.select().from(providerApplicationMedia).where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.isCurrent, true),
        isNull(providerApplicationMedia.deletedAt),
      ));
      assertVerificationComplete(media);
      const now = new Date().toISOString();
      const [updatedApplication] = await tx.update(providerApplications).set({
        applicationStatus: "verification_submitted",
        updatedAt: now,
      }).where(eq(providerApplications.id, applicationId)).returning();
      return { application: updatedApplication, media };
    });
  }

  async approveVerification(
    applicationId: number,
    adminId: number,
    internalReviewNotes?: string,
  ): Promise<ProviderApplication> {
    return db.transaction(async tx => {
      const [application] = await tx.select().from(providerApplications)
        .where(eq(providerApplications.id, applicationId))
        .for("update")
        .limit(1);
      if (!application || application.applicationStatus !== "verification_submitted") {
        throw new VerificationMediaError(409, "INVALID_TRANSITION", "The application is not awaiting verification review.");
      }
      const media = await tx.select().from(providerApplicationMedia).where(and(
        eq(providerApplicationMedia.applicationId, applicationId),
        eq(providerApplicationMedia.isCurrent, true),
        isNull(providerApplicationMedia.deletedAt),
      ));
      if (!canApproveVerification(media)) {
        throw new VerificationMediaError(409, "MEDIA_REVIEW_INCOMPLETE", "All three current vehicle media items must be approved first.");
      }
      const now = new Date().toISOString();
      const [updated] = await tx.update(providerApplications).set({
        applicationStatus: "approved_needs_setup",
        reviewedAt: now,
        reviewedBy: adminId,
        ...(internalReviewNotes === undefined ? {} : { internalReviewNotes }),
        updatedAt: now,
      }).where(eq(providerApplications.id, applicationId)).returning();
      return updated;
    });
  }

  expiredUploads(cutoffIso: string): Promise<ProviderApplicationMedia[]> {
    return db.select().from(providerApplicationMedia).where(and(
      isNull(providerApplicationMedia.deletedAt),
      lt(providerApplicationMedia.uploadExpiresAt, cutoffIso),
      sql`${providerApplicationMedia.uploadStatus} IN ('pending', 'uploading')`,
    ));
  }

  cleanupCandidates(cutoffIso: string): Promise<ProviderApplicationMedia[]> {
    return db.select().from(providerApplicationMedia).where(and(
      lt(providerApplicationMedia.updatedAt, cutoffIso),
      isNull(providerApplicationMedia.objectDeletedAt),
      sql`(
        ${providerApplicationMedia.uploadStatus} = 'abandoned'
        OR ${providerApplicationMedia.deletedAt} IS NOT NULL
        OR (${providerApplicationMedia.isCurrent} = false AND ${providerApplicationMedia.supersededAt} IS NOT NULL)
      )`,
    ));
  }

  async markAbandoned(id: number, reason: string): Promise<void> {
    await db.update(providerApplicationMedia).set({
      uploadStatus: "abandoned",
      failureReason: reason,
      updatedAt: new Date().toISOString(),
    }).where(eq(providerApplicationMedia.id, id));
  }

  async markObjectDeleted(id: number): Promise<void> {
    await db.update(providerApplicationMedia).set({
      objectDeletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(providerApplicationMedia.id, id));
  }
}
