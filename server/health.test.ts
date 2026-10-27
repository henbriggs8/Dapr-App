import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { registerHealthRoutes } from "./health";

test("liveness, database readiness, draining and error redaction are distinct", async () => {
  let ready = true, draining = false, throws = false;
  const app = express();
  registerHealthRoutes(app, async () => { if (throws) throw new Error("database-secret"); return ready; }, () => draining);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(base + "/health/live")).status, 200);
    assert.equal((await fetch(base + "/health/ready")).status, 200);
    ready = false;
    assert.equal((await fetch(base + "/health/ready")).status, 503);
    assert.equal((await fetch(base + "/health/live")).status, 200);
    throws = true; assert.equal((await (await fetch(base + "/health/ready")).text()).includes("database-secret"), false);
    draining = true; assert.equal((await fetch(base + "/health")).status, 503);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});
