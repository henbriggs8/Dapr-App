import assert from "node:assert/strict";
import test from "node:test";
import { assertStagingConfiguration, postgresPoolConfig } from "./runtime-policy";

function staging(): NodeJS.ProcessEnv {
  return { APP_ENV: "staging", SESSION_STORE: "postgres", DATABASE_URL: "postgresql://fixture:fixture@postgres.railway.internal/dapr_staging",
    DATABASE_SSL: "disable", STAGING_DATABASE_HOST: "postgres.railway.internal", STAGING_ISOLATION_CONFIRMED: "true",
    STRIPE_SECRET_KEY: "sk_test_fixture", CLERK_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_fixture", VITE_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
    SESSION_SECRET: "a".repeat(48), VERIFICATION_MEDIA_TOKEN_SECRET: "b".repeat(48),
    VITE_CLERK_ACCOUNT_PORTAL_URL: "https://fixture.accounts.dev", SITE_URL: "https://dapr-staging.up.railway.app", VITE_API_BASE_URL: "https://dapr-staging.up.railway.app",
    S3_BUCKET: "dapr-staging-media", S3_ENDPOINT: "https://storage.invalid", S3_REGION: "auto",
    S3_ACCESS_KEY_ID: "fixture", S3_SECRET_ACCESS_KEY: "fixture", VERIFICATION_MEDIA_BACKEND: "s3",
    VERIFICATION_MEDIA_ENVIRONMENT: "staging", SEED_CATALOG_ON_START: "false", OUTBOUND_DELIVERY_MODE: "disabled",
    BOOKING_NOTIFICATION_DISPATCH_ENABLED: "false", PROVIDER_NOTIFICATION_DISPATCH_ENABLED: "false",
    PUSH_NOTIFICATION_ENVIRONMENT: "development" };
}
test("isolated staging configuration is accepted without contacting services", () => assert.doesNotThrow(() => assertStagingConfiguration(staging())));
test("staging rejects mixed live identities, data planes and delivery credentials", () => {
  const changes = { STRIPE_SECRET_KEY: "sk_live_fixture", CLERK_SECRET_KEY: "sk_live_fixture", VITE_CLERK_PUBLISHABLE_KEY: "pk_live_fixture",
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_live_fixture", DATABASE_URL: "postgres://fixture:fixture@live.invalid/main", STAGING_DATABASE_HOST: "other.invalid",
    S3_BUCKET: "production-media", SITE_URL: "https://www.autodapper.com", VITE_API_BASE_URL: "https://dapper-pros.replit.app",
    VERIFICATION_MEDIA_ENVIRONMENT: "production", SEED_CATALOG_ON_START: "true", RESEND_API_KEY: "fixture",
    FIREBASE_SERVICE_ACCOUNT_JSON: "{}", OUTBOUND_DELIVERY_MODE: "enabled", BOOKING_NOTIFICATION_DISPATCH_ENABLED: "true",
    PROVIDER_NOTIFICATION_DISPATCH_ENABLED: "true", PUSH_NOTIFICATION_ENVIRONMENT: "production", REPL_ID: "fixture",
    SESSION_SECRET: "short", VERIFICATION_MEDIA_TOKEN_SECRET: "replace-with-example", STAGING_ISOLATION_CONFIRMED: "false" };
  for (const [key, value] of Object.entries(changes)) assert.throws(() => assertStagingConfiguration({ ...staging(), [key]: value }), key);
});
test("Railway entrypoint rejects missing staging/project identity", () => {
  assert.throws(() => assertStagingConfiguration({ RAILWAY_PROJECT_ID: "fixture" }));
  assert.throws(() => assertStagingConfiguration({ ...staging(), RAILWAY_PROJECT_ID: "one", STAGING_RAILWAY_PROJECT_ID: "two" }));
});
test("database transport enforces certificate verification and prevents SSL URL override", () => {
  assert.deepEqual(postgresPoolConfig({ DATABASE_URL: "postgres://fixture:fixture@db.invalid/test", DATABASE_SSL: "verify-full" }).ssl, { rejectUnauthorized: true });
  assert.throws(() => postgresPoolConfig({ DATABASE_URL: "postgres://fixture:fixture@db.invalid/test", DATABASE_SSL: "disable" }));
  assert.throws(() => postgresPoolConfig({ DATABASE_URL: "postgres://fixture:fixture@localhost/test?sslmode=no-verify", DATABASE_SSL: "verify-full" }));
});

test("Railway startup binds the intended staging environment and rejects unfilled placeholders", () => {
  const railway = { ...staging(), RAILWAY_PROJECT_ID: "project-fixture", STAGING_RAILWAY_PROJECT_ID: "project-fixture",
    RAILWAY_ENVIRONMENT_NAME: "staging", RAILWAY_ENVIRONMENT_ID: "environment-fixture", STAGING_RAILWAY_ENVIRONMENT_ID: "environment-fixture" };
  assert.doesNotThrow(() => assertStagingConfiguration(railway));
  assert.throws(() => assertStagingConfiguration({ ...railway, RAILWAY_ENVIRONMENT_NAME: "production" }));
  assert.throws(() => assertStagingConfiguration({ ...railway, STAGING_RAILWAY_ENVIRONMENT_ID: "wrong" }));
  assert.throws(() => assertStagingConfiguration({ ...railway, S3_ACCESS_KEY_ID: "REPLACE_WITH_KEY" }));
});
