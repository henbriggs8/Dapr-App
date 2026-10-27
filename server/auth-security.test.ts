import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { once } from "node:events";
import { createServer } from "node:http";
import express from "express";
import session from "express-session";
import { WebSocket } from "ws";
import type { User, InsertUser } from "@shared/schema";
import { hashPassword, setupAuth } from "./auth";
import { registerClerkAccountRoutes } from "./clerk-account-routes";
import { attachAuthenticatedWebSocketServer } from "./authenticated-websocket";

process.env.SESSION_SECRET = "isolated-regression-session-secret-not-for-deployment";
const fixture = (id: number, username: string, roles = {}) => ({
  id, username, password: "unused", name: "Existing", email: "existing@example.test",
  isAdmin: false, isProvider: false, currentStatus: "offline", ...roles,
}) as User;

async function harness(t: TestContext) {
  const users = new Map<number, User>([
    [1, fixture(1, "clerk_customer")],
    [2, fixture(2, "clerk_provider", { isProvider: true })],
    [3, fixture(3, "legacyadmin", { isAdmin: true })],
  ]);
  users.get(3)!.password = await hashPassword("legacy-test-only");
  const calls = { verified: [] as string[], profiles: [] as string[], created: [] as InsertUser[] };
  const tokens = new Map([
    ["customer-token", { sub: "customer", exp: Math.floor(Date.now() / 1000) + 3600 }],
    ["provider-token", { sub: "provider", exp: Math.floor(Date.now() / 1000) + 3600 }],
    ["new-token", { sub: "new", exp: Math.floor(Date.now() / 1000) + 3600 }],
  ]);
  const verifyToken = async (token: string) => {
    calls.verified.push(token);
    const claims = tokens.get(token);
    if (!claims || claims.exp * 1000 <= Date.now()) throw new Error("Invalid or expired");
    return claims;
  };
  const store = new session.MemoryStore();
  const lookup = async (username: string) => Array.from(users.values()).find(u => u.username === username);
  const app = express();
  app.use(express.json());
  const middleware = setupAuth(app, { sessionStore: store, getUser: async id => users.get(id), getUserByUsername: lookup }, verifyToken);
  registerClerkAccountRoutes(app, {
    verifyToken, getUserByUsername: lookup,
    getClerkUser: async id => {
      calls.profiles.push(id);
      return { firstName: "Verified", lastName: "Customer", emailAddresses: [{ emailAddress: "verified@example.test" }], phoneNumbers: [] };
    },
    createUser: async input => {
      if (Array.from(users.values()).some(user => user.username === input.username)) {
        throw Object.assign(new Error("Duplicate username"), { code: "23505" });
      }
      calls.created.push(input);
      const user = { ...fixture(10, input.username), ...input } as User;
      users.set(user.id, user);
      return user;
    },
  });
  const server = createServer(app);
  const hub = attachAuthenticatedWebSocketServer(server, {
    sessionMiddleware: middleware,
    readSession: id => new Promise((resolve, reject) => store.get(id, (err, value) => err ? reject(err) : resolve(value))),
    getUser: async id => users.get(id), getUserByUsername: lookup, verifyToken,
    authTimeoutMs: 150,
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => { hub.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const post = (path: string, body = {}, headers = {}) => fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  const sync = (token: string, body = {}) => post("/api/auth/clerk-sync", body, { Authorization: `Bearer ${token}` });
  const cookieFor = async (token: string) => {
    const response = await sync(token);
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie")!.split(";")[0];
  };
  const socket = async (headers: Record<string, string> = {}) => {
    const ws = new WebSocket(base.replace("http", "ws") + "/ws", { headers });
    const messages: any[] = [];
    ws.on("message", data => messages.push(JSON.parse(data.toString())));
    const closed = once(ws, "close");
    await once(ws, "open");
    return { ws, messages, closed };
  };
  const authenticate = async (client: Awaited<ReturnType<typeof socket>>, message: object) => {
    const received = once(client.ws, "message");
    client.ws.send(JSON.stringify(message));
    const [data] = await received;
    return JSON.parse(data.toString());
  };
  return { users, calls, tokens, base, hub, post, sync, cookieFor, socket, authenticate };
}

test("retired signup never looks up or changes an existing identity, with or without a session", async t => {
  const h = await harness(t);
  const cookie = await h.cookieFor("customer-token");
  h.calls.verified.length = 0;
  for (const headers of [{}, { Cookie: cookie }]) {
    const response = await h.post("/api/auth/clerk/complete-signup", {
      email: "victim@example.test", phoneNumber: "+15555550123", password: "attacker-choice",
    }, headers);
    assert.equal(response.status, 410);
    assert.equal((await response.json()).code, "CLERK_SIGNUP_REQUIRED");
  }
  assert.deepEqual(h.calls, { verified: [], profiles: [], created: [] });
  assert.equal(h.users.get(1)!.password, "unused");
});

for (const path of ["/api/register", "/api/auth/clerk-sync"]) {
  test(`${path} rejects unauthenticated/invalid credentials and ignores injected identity and roles`, async t => {
    const h = await harness(t);
    const body = { username: "clerk_victim", password: "attacker-choice", isAdmin: true, isProvider: true,
      id: 3, name: "Attacker", email: "victim@example.test", currentStatus: "online", freeWashCredits: 100, stripeCustomerId: "cus_victim" };
    for (const headers of [{}, { Authorization: "Bearer invalid" }]) assert.equal((await h.post(path, body, headers)).status, 401);
    assert.equal(h.calls.created.length, 0);
    const response = await h.post(path, body, { Authorization: "Bearer new-token" });
    assert.equal(response.status, 200);
    const user = await response.json();
    assert.equal(user.username, "clerk_new");
    assert.equal(user.isAdmin, false);
    assert.equal(user.isProvider, false);
    assert.equal(user.name, "Verified Customer");
    assert.equal(user.email, "verified@example.test");
    assert.equal("password" in user, false);
    assert.deepEqual(Object.keys(h.calls.created[0]).sort(), ["username", "password", "isAdmin", "isProvider", "name", "email", "phone"].sort());
    assert.notEqual(h.calls.created[0].password, body.password);
    assert.deepEqual(h.calls.profiles, ["new"]);
  });
}

test("existing Clerk users keep IDs, approval, credentials and working cookie/bearer sessions", async t => {
  const h = await harness(t);
  const before = { ...h.users.get(2)! };
  const response = await h.sync("provider-token", { isProvider: false, isAdmin: true, username: "another", password: "replacement" });
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await response.json()).id, 2);
  assert.deepEqual(h.users.get(2), before);
  assert.equal(h.calls.created.length, 0);
  for (const headers of [{ Cookie: cookie }, { Authorization: "Bearer provider-token" }]) {
    const me = await fetch(h.base + "/api/user", { headers });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).isProvider, true);
  }
  const again = await h.sync("provider-token");
  assert.equal((await again.json()).id, 2);
});

test("existing legacy login sessions survive, but local password login cannot impersonate Clerk identities", async t => {
  const h = await harness(t);
  const legacy = await h.post("/api/login", { username: "legacyadmin", password: "legacy-test-only" });
  assert.equal(legacy.status, 200);
  const cookie = legacy.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await (await fetch(h.base + "/api/user", { headers: { Cookie: cookie } })).json()).id, 3);
  h.users.get(1)!.password = await hashPassword("known-local-password");
  assert.equal((await h.post("/api/login", { username: "clerk_customer", password: "known-local-password" })).status, 401);
  assert.equal((await h.post("/api/login", { username: "legacyadmin", password: "wrong" })).status, 401);
});

test("anonymous WebSockets receive no private or marketplace events and cannot authenticate by user ID", async t => {
  const h = await harness(t);
  const anonymous = await h.socket();
  await h.hub.sendToUsers([1, 2], { type: "location_update", latitude: 33 });
  await h.hub.notifyMarketplace("new_job_available");
  anonymous.ws.send(JSON.stringify({ type: "auth", userId: 1 }));
  assert.equal((await anonymous.closed)[0], 1008);
  assert.deepEqual(anonymous.messages, []);
  const idle = await h.socket();
  assert.equal((await idle.closed)[0], 1008);
  assert.deepEqual(idle.messages, []);
});

test("valid Clerk sockets receive only their participant events and reject identity rebinding", async t => {
  const h = await harness(t);
  const customer = await h.socket();
  const provider = await h.socket();
  assert.deepEqual(await h.authenticate(customer, { type: "auth", token: "customer-token" }), { type: "auth_confirmed", userId: 1 });
  await h.authenticate(provider, { type: "auth", token: "provider-token" });
  const received = once(customer.ws, "message");
  await h.hub.sendToUsers([1], { type: "location_update", bookingId: 20, latitude: 33 });
  assert.equal(JSON.parse((await received)[0].toString()).bookingId, 20);
  assert.equal(provider.messages.length, 1);
  const refresh = once(provider.ws, "message");
  await h.hub.notifyMarketplace("new_job_available", [2]);
  assert.deepEqual(JSON.parse((await refresh)[0].toString()), { type: "new_job_available" });
  assert.equal(customer.messages.length, 2);
  customer.ws.send(JSON.stringify({ type: "auth", token: "provider-token", userId: 2 }));
  assert.equal((await customer.closed)[0], 1008);
});

test("invalid/expired/unsynced Clerk tokens and mismatched user IDs fail closed", async t => {
  const h = await harness(t);
  h.tokens.set("expired", { sub: "customer", exp: 1 });
  for (const message of [
    { type: "auth", token: "invalid" }, { type: "auth", token: "expired" },
    { type: "auth", token: "new-token" }, { type: "auth", token: "customer-token", userId: 2 },
  ]) {
    const client = await h.socket();
    client.ws.send(JSON.stringify(message));
    assert.equal((await client.closed)[0], 1008);
    assert.deepEqual(client.messages, []);
  }
});

test("signed browser cookies authenticate the server identity; logout stops delivery", async t => {
  const h = await harness(t);
  const cookie = await h.cookieFor("customer-token");
  const client = await h.socket({ Cookie: cookie, Origin: "https://www.autodapper.com" });
  assert.equal((await h.authenticate(client, { type: "auth", userId: 1 })).userId, 1);
  const received = once(client.ws, "message");
  await h.hub.sendToUsers([1], { type: "booking_update" });
  await received;
  assert.equal((await h.post("/api/logout", {}, { Cookie: cookie })).status, 200);
  await h.hub.sendToUsers([1], { type: "location_update", latitude: 99 });
  assert.equal((await client.closed)[0], 1008);
  assert.equal(client.messages.length, 2);
});

test("cookie identity cannot be forged, used cross-origin or used as fallback for an invalid token", async t => {
  const h = await harness(t);
  const cookie = await h.cookieFor("customer-token");
  for (const [headers, message] of [
    [{ Cookie: cookie, Origin: "https://www.autodapper.com" }, { type: "auth", userId: 2 }],
    [{ Cookie: cookie + "tampered", Origin: "https://www.autodapper.com" }, { type: "auth" }],
    [{ Cookie: cookie }, { type: "auth" }],
    [{ Cookie: cookie, Origin: "https://evil.example" }, { type: "auth" }],
    [{ Cookie: cookie, Origin: "https://www.autodapper.com" }, { type: "auth", token: "invalid" }],
  ] as [Record<string, string>, object][]) {
    const client = await h.socket(headers);
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(JSON.stringify(message));
    assert.equal((await client.closed)[0], 1008);
    assert.deepEqual(client.messages, []);
  }
});

test("deleted users and expired tokens stop receiving private events", async t => {
  const h = await harness(t);
  for (const reason of ["deleted", "expired"]) {
    h.users.set(1, fixture(1, "clerk_customer"));
    h.tokens.set("customer-token", { sub: "customer", exp: Math.floor(Date.now() / 1000) + 3600 });
    const client = await h.socket();
    await h.authenticate(client, { type: "auth", token: "customer-token" });
    if (reason === "deleted") h.users.delete(1);
    else h.tokens.set("customer-token", { sub: "customer", exp: 1 });
    await h.hub.sendToUsers([1], { type: "location_update" });
    assert.equal((await client.closed)[0], 1008);
    assert.equal(client.messages.length, 1);
  }
});


test("simultaneous first Clerk syncs resolve to one customer identity without changing roles", async t => {
  const h = await harness(t);
  const responses = await Promise.all([h.sync("new-token", { isAdmin: true }), h.sync("new-token", { isProvider: true })]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    const user = await response.json();
    assert.equal(user.id, 10);
    assert.equal(user.isAdmin, false);
    assert.equal(user.isProvider, false);
  }
  assert.equal(h.calls.created.length, 1);
});

test("malformed auth frames are rejected and revoked provider roles receive no marketplace notification", async t => {
  const h = await harness(t);
  const malformed = await h.socket();
  malformed.ws.send("not-json");
  assert.equal((await malformed.closed)[0], 1008);
  assert.deepEqual(malformed.messages, []);
  const provider = await h.socket();
  await h.authenticate(provider, { type: "auth", token: "provider-token" });
  h.users.get(2)!.isProvider = false;
  await h.hub.notifyMarketplace("new_job_available");
  assert.equal(provider.messages.length, 1);
});
