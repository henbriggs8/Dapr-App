import assert from "node:assert/strict";
import test from "node:test";
import { FirebaseConfigurationError, getFirebaseApp, resetFirebaseAppForTests } from "./firebase-admin";
import { PushService } from "./push-service";
import type { PushDeviceRepository } from "./push-device-repository";

test("Firebase configuration failure is lazy and clear", () => {
  const original = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  resetFirebaseAppForTests();
  assert.throws(() => getFirebaseApp(), (error: unknown) => error instanceof FirebaseConfigurationError && /FIREBASE_SERVICE_ACCOUNT_JSON/.test(error.message));
  if (original === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = original;
});

test("invalid Firebase service-account JSON fails only when delivery initializes", () => {
  const original = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "{not-json";
  resetFirebaseAppForTests();
  assert.throws(() => getFirebaseApp(), (error: unknown) => error instanceof FirebaseConfigurationError && /valid service-account JSON/.test(error.message));
  if (original === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = original;
});

test("invalid Firebase registration tokens are disabled and omitted from results", async () => {
  const disabled: number[] = [];
  const repository: PushDeviceRepository = {
    async register() {},
    async disableForUser() { return false; },
    async enabledForUser() {
      return [{ id: 1, fcmToken: "never-exposed", appType: "customer" }];
    },
    async disableById(id) { disabled.push(id); },
    async disableByToken() {},
  };
  const service = new PushService(repository, () => ({
    async send() {
      throw { code: "messaging/registration-token-not-registered" };
    },
  } as any));
  const result = await service.send({ userId: 7, title: "Title", body: "Body" });
  assert.deepEqual(result, { attempted: 1, delivered: 0, invalidDisabled: 1, failed: 0 });
  assert.deepEqual(disabled, [1]);
  assert.equal(JSON.stringify(result).includes("never-exposed"), false);
});

test("other Firebase failures do not disable device tokens", async () => {
  const disabled: number[] = [];
  const repository: PushDeviceRepository = {
    async register() {},
    async disableForUser() { return false; },
    async enabledForUser() { return [{ id: 1, fcmToken: "token", appType: "customer" }]; },
    async disableById(id) { disabled.push(id); },
    async disableByToken() {},
  };
  const service = new PushService(repository, () => ({
    async send() { throw { code: "messaging/internal-error" }; },
  } as any));
  assert.deepEqual(await service.send({ userId: 7, title: "Title", body: "Body" }), {
    attempted: 1, delivered: 0, invalidDisabled: 0, failed: 1,
  });
  assert.deepEqual(disabled, []);
});

test("token-targeted sends disable a stored invalid registration", async () => {
  const disabled: string[] = [];
  const repository: PushDeviceRepository = {
    async register() {},
    async disableForUser() { return false; },
    async enabledForUser() { return []; },
    async disableById() {},
    async disableByToken(token) { disabled.push(token); },
  };
  const service = new PushService(repository, () => ({
    async send() { throw { code: "messaging/invalid-registration-token" }; },
  } as any));
  assert.deepEqual(await service.sendToTokens(["stored-token"], { title: "Title", body: "Body" }), {
    attempted: 1, delivered: 0, invalidDisabled: 0, failed: 1,
  });
  assert.deepEqual(disabled, ["stored-token"]);
});