import { assertStagingConfiguration } from "../server/runtime-policy";
assertStagingConfiguration();
if (process.env.APP_ENV !== "staging" || process.env.CONFIRM_STAGING_CATALOG !== "dapr_staging") throw new Error("Explicit CONFIRM_STAGING_CATALOG=dapr_staging required");
const { storage } = await import("../server/storage");
const { pool } = await import("../server/db");
try {
  const count = await pool.query("SELECT count(*)::int AS count FROM bookings");
  if (count.rows[0].count !== 0) throw new Error("Catalog preparation requires a staging DB with no bookings");
  await storage.initialize();
} finally {
  (storage.sessionStore as typeof storage.sessionStore & { close?: () => void }).close?.();
  await pool.end();
}
