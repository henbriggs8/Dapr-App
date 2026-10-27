import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { S3VerificationMediaObjectStore } from "./verification-media-object-store";
import { PushService } from "./push-service";

function env(): NodeJS.ProcessEnv { return { NODE_ENV: "test", S3_ENDPOINT: "https://storage.invalid", S3_REGION: "auto",
  S3_BUCKET: "dapr-staging-fixture", S3_ACCESS_KEY_ID: "fixture", S3_SECRET_ACCESS_KEY: "fixture" }; }

test("storage requires explicit credentials and TLS outside loopback tests", () => {
  assert.throws(() => new S3VerificationMediaObjectStore({}));
  assert.throws(() => new S3VerificationMediaObjectStore({ ...env(), S3_ENDPOINT: "http://storage.invalid" }));
});
test("staging object adapter denies other namespaces and traversal before I/O", async () => {
  const store = new S3VerificationMediaObjectStore({ ...env(), APP_ENV: "staging" });
  for (const key of ["production/provider/private.jpg", "staging/../production/private.jpg", "/staging/private.jpg"]) {
    assert.throws(() => store.download(key));
    await assert.rejects(store.upload(key, Readable.from("fixture")));
  }
  store.client.destroy();
});
test("HEAD 404 means missing, while authorization/server failures remain errors", async t => {
  const store = new S3VerificationMediaObjectStore(env());
  const mock = t.mock.method(store.client, "send", async () => { throw { $metadata: { httpStatusCode: 404 } }; });
  assert.equal(await store.exists("staging/fixture.jpg"), false);
  mock.mock.restore();
  t.mock.method(store.client, "send", async () => { throw { $metadata: { httpStatusCode: 403 }, message: "credential-details" }; });
  await assert.rejects(store.exists("staging/fixture.jpg"), /existence check failed/);
  store.client.destroy();
});
test("disabled outbound mode cannot initialize a push sender or query device tokens", async () => {
  const previous = process.env.OUTBOUND_DELIVERY_MODE; process.env.OUTBOUND_DELIVERY_MODE = "disabled";
  try {
    const service = new PushService({ enabledForUser: () => { throw new Error("must not query devices"); } } as any,
      () => { throw new Error("must not contact Firebase"); });
    assert.equal((await service.sendToUser({ userId: 1, title: "fixture", body: "fixture" })).attempted, 0);
    assert.equal((await service.sendToTokens(["fixture"], { title: "fixture", body: "fixture" })).attempted, 0);
  } finally { if (previous === undefined) delete process.env.OUTBOUND_DELIVERY_MODE; else process.env.OUTBOUND_DELIVERY_MODE = previous; }
});
