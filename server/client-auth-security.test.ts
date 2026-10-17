import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { advanceClerkSignUp } from "../client/src/lib/clerk-sign-up";
import { connectAuthenticatedSocket } from "../client/src/lib/authenticated-websocket";

function attempt(fields: string[], status = "missing_requirements", session: string | null = null) {
  const calls: string[] = [];
  return {
    calls, status, createdSessionId: session, unverifiedFields: fields,
    async preparePhoneNumberVerification() { calls.push("phone"); },
    async prepareEmailAddressVerification() { calls.push("email"); },
  };
}

test("signup verifies phone then email before activating the Clerk-created session", async () => {
  const phone = attempt(["phone_number", "email_address"]);
  assert.deepEqual(await advanceClerkSignUp(phone), { step: "phoneOtp" });
  assert.deepEqual(phone.calls, ["phone"]);
  const email = attempt(["email_address"]);
  assert.deepEqual(await advanceClerkSignUp(email), { step: "emailOtp" });
  assert.deepEqual(email.calls, ["email"]);
  assert.deepEqual(await advanceClerkSignUp(attempt([], "complete", "sess_verified")), { step: "complete", sessionId: "sess_verified" });
});

test("email-only signup and incomplete signup never bypass Clerk verification", async () => {
  assert.deepEqual(await advanceClerkSignUp(attempt(["email_address"])), { step: "emailOtp" });
  assert.deepEqual(await advanceClerkSignUp(attempt(["emailAddress"])), { step: "emailOtp" });
  await assert.rejects(advanceClerkSignUp(attempt([], "missing_requirements")), /additional account information/);
  await assert.rejects(advanceClerkSignUp(attempt([], "complete", null)), /additional account information/);
});

class FakeSocket {
  readyState = 1;
  sent: object[] = [];
  onopen?: () => Promise<void>;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; this.onclose?.(); }
  receive(payload: object) { this.onmessage?.({ data: JSON.stringify(payload) }); }
}

test("web and Capacitor sockets authenticate with fresh Clerk tokens, reconnect, and stop after cleanup", async () => {
  const sockets: FakeSocket[] = [];
  const statuses: string[] = [];
  const events: string[] = [];
  let token = "first-token";
  const connection = connectAuthenticatedSocket({
    url: "wss://example.test/ws", getToken: async () => token,
    createSocket: () => { const ws = new FakeSocket(); sockets.push(ws); return ws as unknown as WebSocket; },
    onStatus: status => statuses.push(status), onMessage: event => events.push(event.data), reconnectDelayMs: 1,
  });
  await sockets[0].onopen!();
  assert.deepEqual(sockets[0].sent, [{ type: "auth", token: "first-token" }]);
  assert.deepEqual(statuses, ["connecting"]);
  sockets[0].receive({ type: "location_update" });
  assert.equal(events.length, 0);
  sockets[0].receive({ type: "auth_confirmed", userId: 1 });
  assert.equal(statuses.at(-1), "connected");
  token = "fresh-token";
  sockets[0].close();
  await delay(10);
  await sockets[1].onopen!();
  assert.deepEqual(sockets[1].sent, [{ type: "auth", token: "fresh-token" }]);
  connection.close();
  await delay(10);
  assert.equal(sockets.length, 2);
});

test("legacy browser sockets request signed-cookie auth without asserting a user ID", async () => {
  const socket = new FakeSocket();
  const connection = connectAuthenticatedSocket({
    url: "wss://example.test/ws", getToken: async () => null,
    createSocket: () => socket as unknown as WebSocket, onStatus() {}, onMessage() {},
  });
  await socket.onopen!();
  assert.deepEqual(socket.sent, [{ type: "auth" }]);
  connection.close();
});

test("logout during token acquisition cannot authenticate an abandoned socket", async () => {
  let resolveToken!: (token: string) => void;
  const token = new Promise<string>(resolve => { resolveToken = resolve; });
  const socket = new FakeSocket();
  const connection = connectAuthenticatedSocket({
    url: "wss://example.test/ws", getToken: () => token,
    createSocket: () => socket as unknown as WebSocket, onStatus() {}, onMessage() {},
  });
  const opening = socket.onopen!();
  connection.close();
  resolveToken("token-from-previous-account");
  await opening;
  assert.deepEqual(socket.sent, []);
});
