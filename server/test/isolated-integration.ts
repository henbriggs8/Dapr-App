export function requireLocalIntegrationDatabase(env: NodeJS.ProcessEnv = process.env): string {
  if (env.RUN_ISOLATED_DB_TESTS !== "true" || env.TEST_DATABASE_ISOLATED !== "true") throw new Error("Use npm run test:database with an explicitly disposable local database");
  if (!env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required; no application database fallback");
  const url = new URL(env.TEST_DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost"].includes(url.hostname)
    || !/^\/dapr_test_[a-z0-9_]+$/.test(url.pathname)) throw new Error("Database integration tests require loopback dapr_test_* PostgreSQL");
  if (env.NODE_ENV === "production" || env.APP_ENV === "production" || env.RAILWAY_PROJECT_ID || env.REPLIT_DEPLOYMENT) throw new Error("Integration tests cannot run in a deployment");
  return env.TEST_DATABASE_URL;
}
