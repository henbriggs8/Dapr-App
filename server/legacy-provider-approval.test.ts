import assert from "node:assert/strict";
import test from "node:test";
import {
  approveLegacyProvider,
  LEGACY_PROVIDER_APPROVAL_NOTE,
  LegacyProviderApprovalError,
} from "./legacy-provider-approval";
import { providerApplicationAdminAccess } from "./provider-verification-policy";
import { evaluateProviderEligibility } from "./provider-eligibility";

type FakeUser = {
  id: number;
  name: string;
  username: string;
  isProvider: boolean;
  currentStatus: string;
};

type FakeApplication = {
  id: number;
  userId: number;
  applicationStatus: string;
  internalReviewNotes?: string;
  reviewedBy?: number;
};

class FakeLegacyApprovalDatabase {
  applications: FakeApplication[];
  private nextApplicationId: number;
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(
    readonly user: FakeUser | undefined,
    applications: FakeApplication[] = [],
  ) {
    this.applications = [...applications];
    this.nextApplicationId = Math.max(0, ...applications.map(application => application.id)) + 1;
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      return await callback(this.createTransaction());
    } finally {
      release();
    }
  }

  private createTransaction() {
    return {
      execute: async () => undefined,
      select: (fields: Record<string, unknown>) => {
        const isUserQuery = "isProvider" in fields;
        return {
          from: () => ({
            where: () => isUserQuery
              ? { limit: async () => this.user ? [this.user] : [] }
              : {
                  orderBy: async () => [...this.applications]
                    .sort((left, right) => right.id - left.id)
                    .map(application => ({
                      id: application.id,
                      applicationStatus: application.applicationStatus,
                    })),
                },
          }),
        };
      },
      insert: () => ({
        values: (values: Omit<FakeApplication, "id">) => ({
          returning: async () => {
            const application = { id: this.nextApplicationId++, ...values };
            this.applications.push(application);
            return [{ id: application.id }];
          },
        }),
      }),
    };
  }
}

const provider = (overrides: Partial<FakeUser> = {}): FakeUser => ({
  id: 47,
  name: "Legacy Provider",
  username: "legacy-provider",
  isProvider: true,
  currentStatus: "offline",
  ...overrides,
});

test("zero-application Provider receives exactly one administrative active_provider row", async () => {
  const database = new FakeLegacyApprovalDatabase(provider());
  const result = await approveLegacyProvider(47, 900, database as any);

  assert.deepEqual(result, {
    userId: 47,
    providerName: "Legacy Provider",
    applicationId: 1,
    applicationStatus: "active_provider",
    created: true,
  });
  assert.equal(database.applications.length, 1);
  assert.equal(database.applications[0].applicationStatus, "active_provider");
  assert.equal(database.applications[0].internalReviewNotes, LEGACY_PROVIDER_APPROVAL_NOTE);
  assert.equal(database.applications[0].reviewedBy, 900);
});

test("retry and existing active application are idempotent", async () => {
  const database = new FakeLegacyApprovalDatabase(provider());
  const first = await approveLegacyProvider(47, 900, database as any);
  const retry = await approveLegacyProvider(47, 900, database as any);

  assert.equal(first.created, true);
  assert.equal(retry.created, false);
  assert.equal(retry.applicationId, first.applicationId);
  assert.equal(database.applications.length, 1);
});

test("concurrent attempts serialize and cannot create duplicates", async () => {
  const database = new FakeLegacyApprovalDatabase(provider());
  const [first, second] = await Promise.all([
    approveLegacyProvider(47, 900, database as any),
    approveLegacyProvider(47, 901, database as any),
  ]);

  assert.deepEqual([first.created, second.created].sort(), [false, true]);
  assert.equal(first.applicationId, second.applicationId);
  assert.equal(database.applications.length, 1);
});

test("missing user returns 404", async () => {
  const database = new FakeLegacyApprovalDatabase(undefined);
  await assert.rejects(
    approveLegacyProvider(47, 900, database as any),
    (error: unknown) => error instanceof LegacyProviderApprovalError
      && error.status === 404
      && error.code === "USER_NOT_FOUND",
  );
});

test("non-Provider and inactive Provider are rejected", async () => {
  for (const [target, code] of [
    [provider({ isProvider: false }), "NOT_PROVIDER"],
    [provider({ currentStatus: "inactive" }), "PROVIDER_INACTIVE"],
  ] as const) {
    const database = new FakeLegacyApprovalDatabase(target);
    await assert.rejects(
      approveLegacyProvider(47, 900, database as any),
      (error: unknown) => error instanceof LegacyProviderApprovalError
        && error.status === 409
        && error.code === code,
    );
    assert.equal(database.applications.length, 0);
  }
});

test("all non-legacy application history is ambiguous and cannot be bypassed", async () => {
  const ambiguousStatuses = [
    "draft",
    "submitted",
    "under_review",
    "verification_requested",
    "verification_submitted",
    "approved_needs_setup",
    "rejected",
    "withdrawn",
  ];

  for (const applicationStatus of ambiguousStatuses) {
    const database = new FakeLegacyApprovalDatabase(provider(), [{
      id: 10,
      userId: 47,
      applicationStatus,
    }]);
    await assert.rejects(
      approveLegacyProvider(47, 900, database as any),
      (error: unknown) => error instanceof LegacyProviderApprovalError
        && error.status === 409
        && error.code === "APPLICATION_HISTORY_EXISTS",
    );
    assert.equal(database.applications.length, 1);
  }
});

test("pre-existing active application returns idempotent success without another row", async () => {
  const database = new FakeLegacyApprovalDatabase(provider(), [{
    id: 19,
    userId: 47,
    applicationStatus: "active_provider",
  }]);

  const result = await approveLegacyProvider(47, 900, database as any);

  assert.equal(result.created, false);
  assert.equal(result.applicationId, 19);
  assert.equal(database.applications.length, 1);
});

test("authoritative eligibility passes identity approval while preserving offline availability", async () => {
  const database = new FakeLegacyApprovalDatabase(provider());
  const approval = await approveLegacyProvider(47, 900, database as any);
  const snapshot = {
    isProvider: true,
    currentStatus: "offline",
    applicationStatus: approval.applicationStatus,
    lastHeartbeatAt: null,
  };

  assert.deepEqual(
    evaluateProviderEligibility(snapshot, { requireOnline: false }),
    { eligible: true, code: "ELIGIBLE" },
  );
  assert.deepEqual(
    evaluateProviderEligibility(snapshot),
    { eligible: false, code: "PROVIDER_OFFLINE" },
  );
});
test("Admin authorization rejects unauthenticated customers and Providers without Admin rights", () => {
  assert.equal(providerApplicationAdminAccess(undefined), 401);
  assert.equal(providerApplicationAdminAccess({ isAdmin: false }), 403);
  assert.equal(providerApplicationAdminAccess({ isAdmin: false, isProvider: true } as any), 403);
  assert.equal(providerApplicationAdminAccess({ isAdmin: true }), 200);
});
