import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { registerPushDeviceRoutes } from "./push-device-routes";
import type { PushDeviceRepository } from "./push-device-repository";
import type { PushService } from "./push-service";

const TOKEN = "token_abcdefghijklmnopqrstuvwxyz.0123456789";

function fakeRepository(): PushDeviceRepository & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    async register(input) { calls.push({ method: "register", args: [input] }); },
    async disableForUser(userId, token) {
      calls.push({ method: "disableForUser", args: [userId, token] });
      return false;
    },
    async enabledForUser() { return []; },
    async disableById() {},
    async disableByToken() {},
  };
}

async function testServer() {
  const devices = fakeRepository();
  const sendCalls: unknown[] = [];
  const pushService = { async sendToTokens(tokens: string[], input: unknown) {
    sendCalls.push(input);
    return { attempted: 1, delivered: 1, invalidDisabled: 0, failed: 0 };
  }} as PushService;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const actor = req.get("x-test-actor");
    if (actor === "user") (req as any).user = { id: 7, isAdmin: false };
    if (actor === "admin") (req as any).user = { id: 99, isAdmin: true };
    next();
  });
  registerPushDeviceRoutes(app, devices, pushService);
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
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.deepEqual(body, { success: true });
    assert.equal(JSON.stringify(body).includes(TOKEN), false);
    assert.deepEqual(devices.calls[0], {
      method: "register",
      args: [{ userId: 7, fcmToken: TOKEN, appType: "provider", platform: "ios", environment: "production" }],
    });
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
  const payload = { fcmToken: TOKEN, title: "Test", body: "Push test" };
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
    assert.deepEqual(sendCalls, [{ fcmToken: TOKEN, title: "Test", body: "Push test" }]);
  } finally {
    server.close();
  }
});