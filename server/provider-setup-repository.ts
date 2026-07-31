import { and, eq, isNull } from "drizzle-orm";
import {
  providerApplicationMedia,
  providerApplications,
  providerApplicationSetup,
  users,
  type ProviderApplication,
  type ProviderApplicationMedia,
  type ProviderApplicationSetup,
} from "@shared/schema";
import { db } from "./db";
import {
  ProviderSetupError,
  activationBlockers,
  assertSetupAccessible,
  assertSetupOwner,
  type ServiceAreaInput,
} from "./provider-setup-policy";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ProviderSetupState = {
  application: ProviderApplication;
  setup: ProviderApplicationSetup | null;
  media: ProviderApplicationMedia[];
  trainingAdmin: { id: number; name: string | null; email: string | null } | null;
};

type LockedSetupContext = {
  application: ProviderApplication;
  setup: ProviderApplicationSetup;
};

export class ProviderSetupRepository {
  async getState(applicationId: number, ownerUserId?: number): Promise<ProviderSetupState> {
    const [application] = await db.select().from(providerApplications)
      .where(eq(providerApplications.id, applicationId))
      .limit(1);
    if (!application) {
      throw new ProviderSetupError(404, "APPLICATION_NOT_FOUND", "Provider application was not found.");
    }
    if (ownerUserId !== undefined) assertSetupOwner(application, ownerUserId);
    assertSetupAccessible(application);
    const [setup] = await db.select().from(providerApplicationSetup)
      .where(eq(providerApplicationSetup.applicationId, applicationId))
      .limit(1);
    const media = await this.currentMedia(db, applicationId);
    const trainingAdmin = setup?.trainingCompletedBy
      ? await this.trainingAdmin(db, setup.trainingCompletedBy)
      : null;
    return { application, setup: setup ?? null, media, trainingAdmin };
  }

  acknowledgeServiceGuide(
    applicationId: number,
    userId: number,
    version: string,
  ): Promise<ProviderSetupState> {
    return db.transaction(async tx => {
      const context = await this.lockSetup(tx, applicationId, userId);
      const now = new Date().toISOString();
      const [setup] = await tx.update(providerApplicationSetup).set({
        serviceGuideVersion: version,
        serviceGuideAcknowledgedAt: now,
        updatedAt: now,
      }).where(eq(providerApplicationSetup.id, context.setup.id)).returning();
      return this.evaluateAndRead(tx, context.application, setup);
    });
  }

  confirmServiceArea(
    applicationId: number,
    userId: number,
    input: ServiceAreaInput,
  ): Promise<ProviderSetupState> {
    return db.transaction(async tx => {
      const context = await this.lockSetup(tx, applicationId, userId);
      const now = new Date().toISOString();
      const [setup] = await tx.update(providerApplicationSetup).set({
        serviceAreaRegion: input.region,
        serviceAreaZipCodes: input.zipCodes,
        maxTravelRadius: input.maxTravelRadius,
        serviceAreaConfirmedAt: now,
        updatedAt: now,
      }).where(eq(providerApplicationSetup.id, context.setup.id)).returning();
      return this.evaluateAndRead(tx, context.application, setup);
    });
  }

  completeTraining(
    applicationId: number,
    adminId: number,
    notes: string | null,
  ): Promise<ProviderSetupState> {
    return db.transaction(async tx => {
      const [admin] = await tx.select({
        id: users.id,
        isAdmin: users.isAdmin,
      }).from(users).where(eq(users.id, adminId)).limit(1);
      if (!admin?.isAdmin) {
        throw new ProviderSetupError(403, "ADMIN_REQUIRED", "Admin access required.");
      }
      const context = await this.lockSetup(tx, applicationId);
      const now = new Date().toISOString();
      const [setup] = await tx.update(providerApplicationSetup).set({
        trainingCompletedAt: context.setup.trainingCompletedAt ?? now,
        trainingCompletedBy: context.setup.trainingCompletedBy ?? adminId,
        trainingNotes: context.setup.trainingCompletedAt
          ? context.setup.trainingNotes
          : notes,
        updatedAt: now,
      }).where(eq(providerApplicationSetup.id, context.setup.id)).returning();
      return this.evaluateAndRead(tx, context.application, setup);
    });
  }

  private async lockSetup(
    tx: Transaction,
    applicationId: number,
    ownerUserId?: number,
  ): Promise<LockedSetupContext> {
    const [application] = await tx.select().from(providerApplications)
      .where(eq(providerApplications.id, applicationId))
      .for("update")
      .limit(1);
    if (!application) {
      throw new ProviderSetupError(404, "APPLICATION_NOT_FOUND", "Provider application was not found.");
    }
    assertSetupAccessible(application);
    if (ownerUserId !== undefined) assertSetupOwner(application, ownerUserId);
    if (!application.userId) {
      throw new ProviderSetupError(409, "APPLICATION_OWNER_REQUIRED", "The application is not linked to a provider account.");
    }

    const [providerUser] = await tx.select({ id: users.id }).from(users)
      .where(eq(users.id, application.userId))
      .for("update")
      .limit(1);
    if (!providerUser) {
      throw new ProviderSetupError(409, "PROVIDER_USER_NOT_FOUND", "The application owner account was not found.");
    }

    const now = new Date().toISOString();
    await tx.insert(providerApplicationSetup).values({
      applicationId,
      userId: application.userId,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing({ target: providerApplicationSetup.applicationId });

    const [setup] = await tx.select().from(providerApplicationSetup)
      .where(eq(providerApplicationSetup.applicationId, applicationId))
      .for("update")
      .limit(1);
    if (!setup || setup.userId !== application.userId) {
      throw new ProviderSetupError(
        409,
        "SETUP_OWNERSHIP_MISMATCH",
        "The provider setup record does not match the application owner.",
      );
    }
    return { application, setup };
  }

  private async evaluateAndRead(
    tx: Transaction,
    application: ProviderApplication,
    setup: ProviderApplicationSetup,
  ): Promise<ProviderSetupState> {
    const media = await this.currentMedia(tx, application.id, true);
    const blockers = activationBlockers(application.applicationStatus, setup, media);
    let finalApplication = application;
    let finalSetup = setup;

    if (application.applicationStatus === "approved_needs_setup" && blockers.length === 0) {
      const now = new Date().toISOString();
      const [activatedApplication] = await tx.update(providerApplications).set({
        applicationStatus: "active_provider",
        updatedAt: now,
      }).where(and(
        eq(providerApplications.id, application.id),
        eq(providerApplications.applicationStatus, "approved_needs_setup"),
      )).returning();
      if (activatedApplication) {
        await tx.update(users).set({
          isProvider: true,
          currentStatus: "offline",
        }).where(eq(users.id, application.userId!));
        const [activatedSetup] = await tx.update(providerApplicationSetup).set({
          activatedAt: setup.activatedAt ?? now,
          updatedAt: now,
        }).where(eq(providerApplicationSetup.id, setup.id)).returning();
        finalApplication = activatedApplication;
        finalSetup = activatedSetup;
      } else {
        const [reloaded] = await tx.select().from(providerApplications)
          .where(eq(providerApplications.id, application.id))
          .limit(1);
        if (!reloaded || reloaded.applicationStatus !== "active_provider") {
          throw new ProviderSetupError(409, "ACTIVATION_CONFLICT", "Provider activation state changed.");
        }
        finalApplication = reloaded;
      }
    }

    const trainingAdmin = finalSetup.trainingCompletedBy
      ? await this.trainingAdmin(tx, finalSetup.trainingCompletedBy)
      : null;
    return {
      application: finalApplication,
      setup: finalSetup,
      media,
      trainingAdmin,
    };
  }

  private currentMedia(
    executor: Pick<typeof db, "select">,
    applicationId: number,
    lock = false,
  ): Promise<ProviderApplicationMedia[]> {
    const query = executor.select().from(providerApplicationMedia).where(and(
      eq(providerApplicationMedia.applicationId, applicationId),
      eq(providerApplicationMedia.isCurrent, true),
      isNull(providerApplicationMedia.deletedAt),
    ));
    return (lock ? query.for("update") : query) as Promise<ProviderApplicationMedia[]>;
  }

  private async trainingAdmin(
    executor: Pick<typeof db, "select">,
    adminId: number,
  ): Promise<{ id: number; name: string | null; email: string | null } | null> {
    const [admin] = await executor.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, adminId)).limit(1);
    return admin ?? null;
  }
}
