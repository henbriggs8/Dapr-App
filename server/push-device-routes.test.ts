import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { registerPushDeviceRoutes } from "./push-device-routes";
import type { PushDeviceRepository } from "./push-device-repository";
import type { PushService } from "./push-service";

const TOKEN = "token_abcdefghijklmnopqrstuvwxyz.0123456789";

function fakeRepository(registerError?: unknown): PushDeviceRepository & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    async register(input) {
      if (registerError) throw registerError;
      calls.push({ method: "register", args: [input] });
    },
    async disableForUser(userId, token) {
      calls.push({ method: "disableForUser", args: [userId, token] });
      return false;
    },
    async enabledForUser() { return []; },
    async disableById() {},
    async disableByToken() {},
  };
}

async function testServer(registerError?: unknown, providerEligible?: (userId: number) => Promise<boolean>) {
  const devices = fakeRepository(registerError);
  const sendCalls: unknown[] = [];
  const pushService = { async send(input: unknown) {
    sendCalls.push(input);
    return { attempted: 1, delivered: 1, invalidDisabled: 0, failed: 0 };
  }} as unknown as PushService;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const actor = req.get("x-test-actor");
    if (actor === "user") (req as any).user = { id: 7, isAdmin: false, isProvider: false };
    if (actor === "provider") (req as any).user = { id: 8, isAdmin: false, isProvider: true };
    if (actor === "admin") (req as any).user = { id: 99, isAdmin: true, isProvider: false };
    next();
  });
  registerPushDeviceRoutes(app, devices, pushService, { providerEligible });
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ code: "INTERNAL_ERROR" });
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    devices,
    sendCalls,
    server,
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${address.port}${path}`, init),
  };
}

test("push registration requires auth, safely validates, and never returns tokens", async () => {
  const { server, request, devices } = await testServer();
  try {
    let response = await request("/api/push-devices/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "development" }),
    });
    assert.equal(response.status, 401);

    response = await request("/api/push-devices/register", {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: "short", appType: "customer", platform: "ios", environment: "development" }),
    });
    assert.equal(response.status, 400);

    response = await request("/api/push-devices/register", {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN, appType: "provider", platform: "ios", environment: "production" }),
    });
    assert.equal(response.status, 400);

    response = await request("/api/push-devices/register", {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "production" }),
    });
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.deepEqual(body, { success: true });
    assert.equal(JSON.stringify(body).includes(TOKEN), false);
    assert.deepEqual(devices.calls[0], {
      method: "register",
      args: [{ userId: 7, fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "production" }],
    });
  } finally {
    server.close();
  }
});

test("a provider can register either provider or customer app context", async () => {
  const { server, request, devices } = await testServer();
  try {
    for (const appType of ["provider", "customer"]) {
      const response = await request("/api/push-devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-test-actor": "provider" },
        body: JSON.stringify({ fcmToken: `${TOKEN}${appType}`, appType, platform: "ios", environment: "development" }),
      });
      assert.equal(response.status, 200);
    }
    assert.equal(devices.calls.length, 2);
  } finally {
    server.close();
  }
});

test("provider app registration requires an active Provider identity", async () => {
  const { server, request, devices } = await testServer(undefined, async () => false);
  try {
    const response = await request("/api/push-devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "provider" },
      body: JSON.stringify({ fcmToken: TOKEN, appType: "provider", platform: "ios", environment: "development" }),
    });
    assert.equal(response.status, 403);
    assert.equal(devices.calls.length, 0);

    const customerContext = await request("/api/push-devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "provider" },
      body: JSON.stringify({ fcmToken: `${TOKEN}customer`, appType: "customer", platform: "ios", environment: "development" }),
    });
    assert.equal(customerContext.status, 200, "Provider users retain the independent Customer app context");
  } finally {
    server.close();
  }
});

test("missing push_devices schema receives a controlled unavailable response", async () => {
  const { server, request } = await testServer({
    code: "42P01",
    table: "push_devices",
    message: 'relation "push_devices" does not exist',
  });
  try {
    const response = await request("/api/push-devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "development" }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      code: "PUSH_UNAVAILABLE",
      error: "Push device storage is not configured.",
    });
  } finally {
    server.close();
  }
});

test("other push storage failures are not converted into missing-schema responses", async () => {
  const { server, request } = await testServer({ code: "08006", message: "connection failure" });
  try {
    const response = await request("/api/push-devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "development" }),
    });
    assert.equal(response.status, 500);
    assert.notEqual(response.status, 503);
  } finally {
    server.close();
  }
});

test("push migration preserves and backfills legacy tokens safely", async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const migration = await readFile(resolve(here, "../migrations/0008_push_devices.sql"), "utf8");
  assert.doesNotMatch(migration, /DROP\s+COLUMN/i);
  assert.match(migration, /INSERT INTO "push_devices"/);
  assert.match(migration, /"push_token" IS NOT NULL/);
  assert.match(migration, /btrim\("push_token"\) <> ''/);
  assert.match(migration, /CASE WHEN "is_provider" THEN 'provider' ELSE 'customer' END/);
  assert.match(migration, /ON CONFLICT \("fcm_token"\) DO NOTHING/);
});

test("push cleanup migration drops only the legacy column and includes verification guidance", async () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const cleanup = await readFile(resolve(here, "../migrations/0009_push_legacy_cleanup.sql"), "utf8");
  // Must drop the legacy column.
  assert.match(cleanup, /ALTER TABLE "users" DROP COLUMN/i);
  assert.match(cleanup, /"push_token"/);
  // Must not drop the push_devices table or any of its columns.
  assert.doesNotMatch(cleanup, /DROP TABLE/i);
  assert.doesNotMatch(cleanup, /push_devices.*DROP COLUMN/i);
  // Must carry the verification query so operators can confirm readiness.
  assert.match(cleanup, /push_devices.*notifications_enabled/s);
  // Staged comment must warn against premature application.
  assert.match(cleanup, /DO NOT APPLY/i);
});

test("repeated registration of the same token is idempotent and refreshes the device", async () => {
  // Stateful store mirroring the repository's ON CONFLICT (fcm_token) upsert.
  const store = new Map<string, { userId: number; appType: string; environment: string; enabled: boolean }>();
  const devices: PushDeviceRepository = {
    async register(input) {
      store.set(input.fcmToken, {
        userId: input.userId,
        appType: input.appType,
        environment: input.environment,
        enabled: true,
      });
    },
    async disableForUser(userId, token) {
      const device = store.get(token);
      if (!device || device.userId !== userId || !device.enabled) return false;
      device.enabled = false;
      return true;
    },
    async enabledForUser() { return []; },
    async disableById() {},
    async disableByToken() {},
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const actor = req.get("x-test-actor");
    if (actor === "user") (req as any).user = { id: 7, isAdmin: false, isProvider: false };
    if (actor === "provider") (req as any).user = { id: 8, isAdmin: false, isProvider: true };
    next();
  });
  registerPushDeviceRoutes(app, devices, { async sendToTokens() {
    return { attempted: 0, delivered: 0, invalidDisabled: 0, failed: 0 };
  }} as unknown as PushService);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const request = (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${address.port}${path}`, init);
  try {
    const register = (actor: string, body: Record<string, unknown>) => request("/api/push-devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": actor },
      body: JSON.stringify(body),
    });

    // Duplicate registration: same user, same token, twice -> one device.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await register("user", { fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "development" });
      assert.equal(response.status, 200);
    }
    assert.equal(store.size, 1);
    assert.deepEqual(store.get(TOKEN), { userId: 7, appType: "customer", environment: "development", enabled: true });

    // Token refresh after the device changes hands: the token is reassigned,
    // re-enabled, and updated in place -- never duplicated.
    let disable = await request("/api/push-devices/current", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN }),
    });
    assert.equal(disable.status, 200);
    assert.equal(store.get(TOKEN)?.enabled, false);

    const refreshed = await register("provider", { fcmToken: TOKEN, appType: "provider", platform: "ios", environment: "production" });
    assert.equal(refreshed.status, 200);
    assert.equal(store.size, 1);
    assert.deepEqual(store.get(TOKEN), { userId: 8, appType: "provider", environment: "production", enabled: true });

    // App-type separation: the original customer cannot disable the token the
    // provider now owns.
    disable = await request("/api/push-devices/current", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN }),
    });
    assert.equal(disable.status, 200); // idempotent response
    assert.deepEqual(store.get(TOKEN), { userId: 8, appType: "provider", environment: "production", enabled: true });
  } finally {
    server.close();
  }
});

test("a user can idempotently disable only their own token", async () => {
  const { server, request, devices } = await testServer();
  try {
    const requestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ fcmToken: TOKEN }),
    };
    const first = await request("/api/push-devices/current", { ...requestInit, method: "DELETE" });
    const second = await request("/api/push-devices/current", { ...requestInit, method: "DELETE" });
    assert.deepEqual(await first.json(), { success: true });
    assert.deepEqual(await second.json(), { success: true });
    assert.deepEqual(devices.calls.map((call) => call.args), [[7, TOKEN], [7, TOKEN]]);
  } finally {
    server.close();
  }
});

test("the legacy registration route safely writes only to the multi-device store", async () => {
  const { server, request, devices } = await testServer();
  try {
    const response = await request("/api/user/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "user" },
      body: JSON.stringify({ token: TOKEN, platform: "ios" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.deepEqual(devices.calls[0], {
      method: "register",
      args: [{ userId: 7, fcmToken: TOKEN, appType: "customer", platform: "ios", environment: "development" }],
    });
  } finally {
    server.close();
  }
});

test("admin test sends enforce authentication and admin access without exposing tokens", async () => {
  const { server, request, sendCalls } = await testServer();
  const payload = { userId: 7, appType: "customer", title: "Test", body: "Push test" };
  try {
    let response = await request("/api/admin/push/test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    assert.equal(response.status, 401);
    response = await request("/api/admin/push/test", {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-actor": "user" }, body: JSON.stringify(payload),
    });
    assert.equal(response.status, 403);
    response = await request("/api/admin/push/test", {
      method: "POST", headers: { "Content-Type": "application/json", "x-test-actor": "admin" }, body: JSON.stringify(payload),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, attempted: 1, delivered: 1, invalidDisabled: 0, failed: 0 });
    // The admin test path targets one explicit user's development devices only.
    assert.deepEqual(sendCalls, [{
      userId: 7,
      appType: "customer",
      environment: "development",
      title: "Test",
      body: "Push test",
      data: undefined,
    }]);

    // A raw-token payload is no longer accepted (no arbitrary-token sends).
    response = await request("/api/admin/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "admin" },
      body: JSON.stringify({ fcmToken: TOKEN, title: "Test", body: "Push test" }),
    });
    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});

test("admin production test sends target only customer production devices for one user", async () => {
  const { server, request, sendCalls } = await testServer();
  try {
    // Explicit production environment is passed through to the send.
    let response = await request("/api/admin/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "admin" },
      body: JSON.stringify({ userId: 7, appType: "customer", environment: "production", title: "Test", body: "Prod test" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(sendCalls, [{
      userId: 7,
      appType: "customer",
      environment: "production",
      title: "Test",
      body: "Prod test",
      data: undefined,
    }]);

    // Provider devices can never be targeted in production.
    response = await request("/api/admin/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "admin" },
      body: JSON.stringify({ userId: 7, appType: "provider", environment: "production", title: "Test", body: "Prod test" }),
    });
    assert.equal(response.status, 400);

    // An invalid environment value is rejected.
    response = await request("/api/admin/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "admin" },
      body: JSON.stringify({ userId: 7, appType: "customer", environment: "all", title: "Test", body: "Prod test" }),
    });
    assert.equal(response.status, 400);

    // A missing userId (would-be broadcast) is rejected.
    response = await request("/api/admin/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-actor": "admin" },
      body: JSON.stringify({ appType: "customer", environment: "production", title: "Test", body: "Prod test" }),
    });
    assert.equal(response.status, 400);

    // Only the one production call reached the push service.
    assert.equal(sendCalls.length, 1);
  } finally {
    server.close();
  }
});
