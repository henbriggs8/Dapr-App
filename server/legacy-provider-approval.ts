import { desc, eq, sql } from "drizzle-orm";
import { providerApplications, users } from "@shared/schema";
import { db } from "./db";

export const LEGACY_PROVIDER_APPROVAL_NOTE =
  "Legacy Provider approved administratively — Provider account predates provider application workflow.";

export type LegacyProviderApprovalResult = {
  userId: number;
  providerName: string;
  applicationId: number;
  applicationStatus: "active_provider";
  created: boolean;
};

export class LegacyProviderApprovalError extends Error {
  constructor(
    public readonly status: 404 | 409,
    public readonly code:
      | "USER_NOT_FOUND"
      | "NOT_PROVIDER"
      | "PROVIDER_INACTIVE"
      | "APPLICATION_HISTORY_EXISTS",
    message: string,
  ) {
    super(message);
    this.name = "LegacyProviderApprovalError";
  }
}

type LegacyApprovalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function approveLegacyProvider(
  userId: number,
  adminUserId: number,
  database: Pick<typeof db, "transaction"> = db,
): Promise<LegacyProviderApprovalResult> {
  return database.transaction(async (tx: LegacyApprovalTransaction) => {
    // Serialize this repair by stable user ID. The first key namespaces the
    // lock so unrelated advisory-lock users cannot collide with this feature.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1146114642, ${userId})`);

    const [user] = await tx.select({
      id: users.id,
      name: users.name,
      username: users.username,
      isProvider: users.isProvider,
      currentStatus: users.currentStatus,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new LegacyProviderApprovalError(404, "USER_NOT_FOUND", "User not found.");
    }
    if (!user.isProvider) {
      throw new LegacyProviderApprovalError(409, "NOT_PROVIDER", "The target user is not a Provider.");
    }
    if (user.currentStatus === "inactive") {
      throw new LegacyProviderApprovalError(409, "PROVIDER_INACTIVE", "Inactive Providers cannot be legacy-approved.");
    }

    const applications = await tx.select({
      id: providerApplications.id,
      applicationStatus: providerApplications.applicationStatus,
    }).from(providerApplications)
      .where(eq(providerApplications.userId, userId))
      .orderBy(desc(providerApplications.id));

    const latest = applications[0];
    const providerName = user.name || user.username;
    if (latest?.applicationStatus === "active_provider") {
      return {
        userId: user.id,
        providerName,
        applicationId: latest.id,
        applicationStatus: "active_provider",
        created: false,
      };
    }
    if (applications.length > 0) {
      throw new LegacyProviderApprovalError(
        409,
        "APPLICATION_HISTORY_EXISTS",
        "Provider application history exists; use the normal review workflow.",
      );
    }

    const now = new Date().toISOString();
    const [application] = await tx.insert(providerApplications).values({
      userId: user.id,
      applicationStatus: "active_provider",
      internalReviewNotes: LEGACY_PROVIDER_APPROVAL_NOTE,
      reviewedAt: now,
      reviewedBy: adminUserId,
      createdAt: now,
      updatedAt: now,
    }).returning({
      id: providerApplications.id,
    });

    return {
      userId: user.id,
      providerName,
      applicationId: application.id,
      applicationStatus: "active_provider",
      created: true,
    };
  });
}
