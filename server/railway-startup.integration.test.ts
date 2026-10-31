import { requireLocalIntegrationDatabase } from "./test/isolated-integration";
const isolated = requireLocalIntegrationDatabase();
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { Pool } from "pg";

const admin = new Pool({ connectionString: isolated });
let created = false, app: ChildProcess | undefined;
const stageUrl = new URL(isolated); stageUrl.pathname = "/dapr_staging";
const reserve = createServer().listen(0, "127.0.0.1"); await once(reserve, "listening");
const port = (reserve.address() as any).port; await new Promise<void>(r => reserve.close(() => r()));
const env: NodeJS.ProcessEnv = { ...process.env, APP_ENV: "staging", NODE_ENV: "production", PORT: String(port),
  DATABASE_URL: stageUrl.href, DATABASE_SSL: "disable", STAGING_DATABASE_HOST: "127.0.0.1", STAGING_ISOLATION_CONFIRMED: "true",
  SESSION_STORE: "postgres", SESSION_SECRET: randomBytes(32).toString("hex"), VERIFICATION_MEDIA_TOKEN_SECRET: randomBytes(32).toString("hex"),
  SITE_URL: "https://dapr-staging.invalid", VITE_API_BASE_URL: "https://dapr-staging.invalid", CLERK_SECRET_KEY: "sk_test_fixture",
  VITE_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZS50ZXN0JA", VITE_CLERK_ACCOUNT_PORTAL_URL: "https://fixture.accounts.dev",
  STRIPE_SECRET_KEY: "sk_test_fixture", VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  S3_ENDPOINT: "https://storage.invalid", S3_BUCKET: "dapr-staging-fixture", SEED_CATALOG_ON_START: "false",
  VERIFICATION_MEDIA_ENVIRONMENT: "staging", PUSH_NOTIFICATION_ENVIRONMENT: "development", OUTBOUND_DELIVERY_MODE: "disabled" };
async function command(script: string, extra: NodeJS.ProcessEnv) {
  const p = spawn(process.execPath, ["--import", "tsx", script], { env: { ...env, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
  let logs=""; p.stdout!.on("data", c => logs+=c); p.stderr!.on("data", c => logs+=c);
  const [code] = await once(p,"exit"); return { code, logs };
}
try {
  await admin.query('CREATE DATABASE dapr_staging'); created = true;
  app = spawn(process.execPath,["dist/index.js"],{env,stdio:["ignore","pipe","pipe"]});
  let logs=""; app.stdout!.on("data",c=>logs+=c); app.stderr!.on("data",c=>logs+=c);
  const base=`http://127.0.0.1:${port}`;
  let started=false;
  for(let i=0;i<100;i++) {
    try { started=(await fetch(base+"/health/live")).status===200; if(started)break; } catch { /* wait for listener */ }
    if (app.exitCode != null) throw new Error(`Application exited during safe startup: ${logs}`);
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(started, logs);
  assert.equal((await fetch(base+"/health/ready")).status,503);
  const stage = new Pool({ connectionString: stageUrl.href });
  try {
    assert.equal((await stage.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n,0,"startup must not migrate or seed");
    const init = await command("scripts/initialize-staging-database.ts",{CONFIRM_EMPTY_STAGING_DATABASE:"dapr_staging"});
    assert.equal(init.code,0,init.logs);
    assert.equal((await command("scripts/initialize-staging-database.ts",{CONFIRM_EMPTY_STAGING_DATABASE:"dapr_staging"})).code,1,"refuse a nonempty staging DB");
    assert.equal((await fetch(base+"/health/ready")).status,503,"catalog requires explicit preparation");
    const seed=await command("scripts/seed-staging-catalog.ts",{CONFIRM_STAGING_CATALOG:"dapr_staging"});assert.equal(seed.code,0,seed.logs);
    assert.equal((await fetch(base+"/health/ready")).status,200);
    const auth=await fetch(base+"/api/user");assert.equal(auth.status,401);
    const origin=await fetch(base+"/api/user",{headers:{Origin:env.SITE_URL!}});assert.equal(origin.headers.get("access-control-allow-origin"),env.SITE_URL);
    const prodOrigin=await fetch(base+"/api/user",{headers:{Origin:"https://www.autodapper.com"}});assert.equal(prodOrigin.headers.get("access-control-allow-origin"),null);
    const webhook=await fetch(base+"/api/webhooks/stripe",{method:"POST",headers:{"content-type":"application/json","stripe-signature":"invalid-fixture"},body:"{}"});assert.equal(webhook.status,400);
    assert.equal((await stage.query('SELECT count(*)::int AS n FROM users')).rows[0].n,0,"no privileged identity seeding");
    assert.equal((await stage.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,0,"no live/customer data");
  } finally { await stage.end(); }
  const exited=once(app,"exit");app.kill("SIGTERM");const [exitCode]=await exited;assert.equal(exitCode,0,logs);app=undefined;
  console.log("PASS: guarded production-mode startup, explicit empty-DB init, duplicate-init refusal, explicit catalog preparation, schema readiness, auth/CORS, raw Stripe signature rejection and graceful shutdown; no external egress");
} finally {
  if(app){const exited=once(app,"exit");app.kill("SIGTERM");await exited;}
  if(created) await admin.query('DROP DATABASE dapr_staging WITH (FORCE)');
  await admin.end();
}
