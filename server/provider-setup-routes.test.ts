import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express, { type NextFunction, type Request, type Response } from "express";
import type { ProviderSetupState } from "./provider-setup-repository";
import { ProviderSetupError } from "./provider-setup-policy";

process.env.DATABASE_URL ||= "postgres://unused:unused@127.0.0.1:1/unused";

const now = "2026-07-30T20:00:00.000Z";
const state = {
  application: {
    id: 42,
    userId: 7,
    applicationStatus: "approved_needs_setup",
  },
  setup: {
    id: 1,
    applicationId: 42,
    userId: 7,
    serviceGuideVersion: "1.0",
    serviceGuideAcknowledgedAt: now,
    serviceAreaRegion: "Phoenix Metro",
    serviceAreaZipCodes: ["85234"],
    maxTravelRadius: 20,
    serviceAreaConfirmedAt: now,
    trainingCompletedAt: null,
    trainingCompletedBy: null,
    trainingNotes: null,
    activatedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  media: ["trunk_photo", "back_seat_photo", "walkaround_video"].map((mediaType, index) => ({
    id: index + 1,
    applicationId: 42,
    mediaType,
    isCurrent: true,
    deletedAt: null,
    uploadStatus: "uploaded",
    processingStatus: "ready",
    reviewStatus: "approved",
  })),
  trainingAdmin: null,
} as ProviderSetupState;

test("provider setup routes enforce ownership and admin authorization and preserve payloads", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const fakeRepository = {
    async getState(applicationId: number, ownerUserId?: number) {
      calls.push({ method: "getState", args: [applicationId, ownerUserId] });
      if (ownerUserId !== undefined && ownerUserId !== 7) {
        throw new ProviderSetupError(403, "ACCESS_DENIED", "Denied.");
      }
      return state;
    },
    async acknowledgeServiceGuide(applicationId: number, userId: number, version: string) {
      calls.push({ method: "acknowledgeServiceGuide", args: [applicationId, userId, version] });
      if (userId !== 7) throw new ProviderSetupError(403, "ACCESS_DENIED", "Denied.");
      return state;
    },
    async confirmServiceArea(applicationId: number, userId: number, input: unknown) {
      calls.push({ method: "confirmServiceArea", args: [applicationId, userId, input] });
      if (userId !== 7) throw new ProviderSetupError(403, "ACCESS_DENIED", "Denied.");
      return state;
    },
    async completeTraining(applicationId: number, adminId: number, notes: string | null) {
      calls.push({ method: "completeTraining", args: [applicationId, adminId, notes] });
      return {
        ...state,
        setup: {
          ...state.setup!,
          trainingCompletedAt: now,
          trainingCompletedBy: adminId,
          trainingNotes: notes,
        },
        trainingAdmin: { id: adminId, name: "Test Admin", email: "admin@example.test" },
      };
    },
  };

  const { registerProviderSetupRoutes } = await import("./provider-setup-routes");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const actor = req.get("x-test-actor");
    if (actor === "owner") (req as any).user = { id: 7, isAdmin: false };
    if (actor === "other") (req as any).user = { id: 8, isAdmin: false };
    if (actor === "admin") (req as any).user = { id: 99, isAdmin: true };
    next();
  });
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    if (!req.user.isAdmin) return res.status(403).json({ code: "ADMIN_REQUIRED", error: "Admin access required." });
    next();
  };
  registerProviderSetupRoutes(app, requireAdmin, fakeRepository);

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseURL = `http://127.0.0.1:${address.port}`;

  const request = (path: string, init?: RequestInit) => fetch(`${baseURL}${path}`, init);
  try {
    let response = await request("/api/provider-applications/42/setup");
    assert.equal(response.status, 401);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);

    response = await request("/api/provider-applications/42/setup", {
      headers: { "x-test-actor": "other" },
    });
    assert.equal(response.status, 403);

    response = await request("/api/provider-applications/42/setup", {
      headers: { "x-test-actor": "owner" },
    });
    assert.equal(response.status, 200);
    const providerBody = await response.json() as any;
    assert.equal(providerBody.steps.serviceGuide.complete, true);
    assert.equal(providerBody.steps.serviceArea.complete, true);
    assert.equal(providerBody.steps.training.complete, false);
    assert.equal("notes" in providerBody.steps.training, false);
    assert.equal("notifications" in providerBody.steps, false);

    response = await request("/api/provider-applications/42/setup/service-guide/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "owner" },
      body: JSON.stringify({ version: "0.9" }),
    });
    assert.equal(response.status, 409);

    response = await request("/api/provider-applications/42/setup/service-area", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-actor": "owner" },
      body: JSON.stringify({
        region: "  Phoenix   Metro ",
        zipCodes: [" 85234 ", "85234"],
        maxTravelRadius: 20,
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(
      calls.find(call => call.method === "confirmServiceArea")?.args[2],
      { region: "Phoenix Metro", zipCodes: ["85234"], maxTravelRadius: 20 },
    );

    response = await request("/api/admin/provider-applications/42/setup", {
      headers: { "x-test-actor": "owner" },
    });
    assert.equal(response.status, 403);

    response = await request("/api/admin/provider-applications/42/setup/training/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "owner" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 403);
    assert.equal(calls.some(call => call.method === "completeTraining"), false);

    response = await request("/api/admin/provider-applications/42/setup/training/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "admin" },
      body: JSON.stringify({ notes: "  Passed supervised test job.  " }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(
      calls.find(call => call.method === "completeTraining")?.args,
      [42, 99, "Passed supervised test job."],
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});
