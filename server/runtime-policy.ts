import { createHash } from "node:crypto";
import type { PoolConfig } from "pg";

export function postgresPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const url = new URL(env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid database protocol");
  const mode = env.DATABASE_SSL;
  let ssl: PoolConfig["ssl"];
  if (mode === "disable") {
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && !url.hostname.endsWith(".railway.internal")) {
      throw new Error("Unencrypted database connections are restricted to loopback/private Railway networking");
    }
    ssl = false;
  } else if (mode === "verify-full") {
    ssl = { rejectUnauthorized: true, ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, "\n") } : {}) };
  } else if (mode) throw new Error("DATABASE_SSL must be disable or verify-full");
  if (mode) {
    // node-postgres lets URL SSL options replace an explicit ssl object.
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
      if (url.searchParams.has(key)) throw new Error("Use DATABASE_SSL/CA settings instead of URL SSL options");
    }
  }
  return { connectionString: url.toString(), ...(ssl !== undefined ? { ssl } : {}),
    max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30_000,
    statement_timeout: 15_000, application_name: `dapr-${env.APP_ENV || "development"}` };
}

export function assertStagingConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  if (env.APP_ENV !== "staging") {
    if (env.RAILWAY_PROJECT_ID) throw new Error("Railway deployment requires APP_ENV=staging in this preparation branch");
    return;
  }
  const requireValue = (key: string) => { if (!env[key]?.trim() || /replace|placeholder/i.test(env[key]!)) throw new Error(`Staging requires a configured ${key}`); return env[key]!; };
  if (requireValue("STAGING_ISOLATION_CONFIRMED") !== "true") throw new Error("Staging isolation must be explicitly confirmed");
  const database = new URL(requireValue("DATABASE_URL"));
  if (database.hostname !== requireValue("STAGING_DATABASE_HOST")) throw new Error("Staging database host mismatch");
  if (!database.hostname.endsWith(".railway.internal") && !["localhost", "127.0.0.1"].includes(database.hostname)) {
    throw new Error("Staging requires private Railway or local PostgreSQL");
  }
  if (database.pathname !== "/dapr_staging") throw new Error("Staging requires the isolated dapr_staging database");
  postgresPoolConfig(env);
  for (const key of ["STRIPE_SECRET_KEY", "CLERK_SECRET_KEY"]) {
    if (!requireValue(key).startsWith("sk_test_")) throw new Error(`Staging requires test-only ${key}`);
  }
  for (const key of ["VITE_STRIPE_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY"]) {
    if (!requireValue(key).startsWith("pk_test_")) throw new Error(`Staging requires test-only ${key}`);
  }
  if (!requireValue("STRIPE_WEBHOOK_SECRET").startsWith("whsec_")) throw new Error("Staging webhook signing secret required");
  for (const key of ["SESSION_SECRET", "VERIFICATION_MEDIA_TOKEN_SECRET"]) {
    if (requireValue(key).length < 32 || /replace|example|placeholder/i.test(env[key]!)) throw new Error(`Generate a fresh ${key}`);
  }
  const portal = new URL(requireValue("VITE_CLERK_ACCOUNT_PORTAL_URL"));
  if (portal.protocol !== "https:" || !portal.hostname.endsWith(".accounts.dev")) throw new Error("Use the isolated Clerk development account portal");
  const site = new URL(requireValue("SITE_URL"));
  if (site.protocol !== "https:" || (!site.hostname.includes("staging") && !site.hostname.endsWith(".up.railway.app"))) {
    throw new Error("Use a staging-only HTTPS SITE_URL");
  }
  if (requireValue("VITE_API_BASE_URL") !== site.origin) throw new Error("Staging frontend/API origins must match");
  if (env.VERIFICATION_MEDIA_BACKEND !== "s3" || env.VERIFICATION_MEDIA_ENVIRONMENT !== "staging") throw new Error("Staging requires isolated S3 media storage");
  if (!/(^|[-_])staging([-_]|$)/i.test(requireValue("S3_BUCKET"))) throw new Error("Use a dedicated staging bucket");
  for (const key of ["S3_ENDPOINT", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) requireValue(key);
  if (new URL(env.S3_ENDPOINT!).protocol !== "https:") throw new Error("Staging S3 endpoint must use HTTPS");
  for (const key of ["BOOKING_NOTIFICATION_DISPATCH_ENABLED", "PROVIDER_NOTIFICATION_DISPATCH_ENABLED", "SEED_CATALOG_ON_START"]) {
    if (env[key] !== "false") throw new Error(`Staging requires ${key}=false during preparation`);
  }
  if (env.SESSION_STORE !== "postgres") throw new Error("Staging requires durable PostgreSQL sessions");
  if (env.OUTBOUND_DELIVERY_MODE !== "disabled" || env.RESEND_API_KEY || env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Email/push delivery must be disabled and credentials absent during staging preparation");
  }
  if (env.PUSH_NOTIFICATION_ENVIRONMENT !== "development") throw new Error("Staging push namespace must be development");
  if (env.REPLIT_DEPLOYMENT || env.REPL_ID) throw new Error("Replit identity must not be copied into staging");
  if (env.RAILWAY_PROJECT_ID) {
    if (requireValue("STAGING_RAILWAY_PROJECT_ID") !== env.RAILWAY_PROJECT_ID) throw new Error("Railway staging project identity mismatch");
    if (env.RAILWAY_ENVIRONMENT_NAME !== "staging" || !env.RAILWAY_ENVIRONMENT_ID
      || requireValue("STAGING_RAILWAY_ENVIRONMENT_ID") !== env.RAILWAY_ENVIRONMENT_ID) {
      throw new Error("Railway staging environment identity mismatch");
    }
  }
}

export function publicConfigFingerprint(env: NodeJS.ProcessEnv = process.env): string {
  const keys = ["VITE_API_BASE_URL", "VITE_CLERK_PUBLISHABLE_KEY", "VITE_STRIPE_PUBLISHABLE_KEY", "VITE_CLERK_ACCOUNT_PORTAL_URL"];
  return createHash("sha256").update(JSON.stringify(keys.map(key => env[key] || ""))).digest("hex");
}
