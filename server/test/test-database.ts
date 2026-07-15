import { readFile } from "node:fs/promises";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const TEST_MARKERS = /(^|[._-])(test|testing|stage|staging|preview|development|dev)([._-]|$)/i;
const PRODUCTION_MARKERS = /(^|[._-])(prod|production|primary|main|live)([._-]|$)/i;

function databaseIdentity(url: URL): string {
  return `${url.hostname}/${url.pathname.replace(/^\//, "")}`;
}

function comparableDatabase(url: URL): string {
  return `${url.protocol}//${url.username}@${url.hostname}:${url.port || "default"}${url.pathname}`;
}

export function redactDatabaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//***@${url.hostname}${port}${url.pathname}`;
}

export function requireSafeTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const rawTestUrl = env.TEST_DATABASE_URL?.trim();
  if (!rawTestUrl) {
    throw new Error("TEST_DATABASE_URL is required. Referral integration tests will not use DATABASE_URL.");
  }

  let testUrl: URL;
  try {
    testUrl = new URL(rawTestUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid database URL.");
  }

  if (!["postgres:", "postgresql:"].includes(testUrl.protocol)) {
    throw new Error("TEST_DATABASE_URL must use the postgres or postgresql protocol.");
  }

  const rawAppUrl = env.DATABASE_URL?.trim();
  if (rawAppUrl) {
    let appUrl: URL;
    try {
      appUrl = new URL(rawAppUrl);
    } catch {
      throw new Error("DATABASE_URL is set but invalid; refusing to guess whether it is production.");
    }
    if (rawTestUrl === rawAppUrl || comparableDatabase(testUrl) === comparableDatabase(appUrl)) {
      throw new Error("TEST_DATABASE_URL resolves to the same database as DATABASE_URL. Refusing to run.");
    }
  }

  const identity = databaseIdentity(testUrl);
  if (PRODUCTION_MARKERS.test(identity)) {
    throw new Error(`TEST_DATABASE_URL appears to be production (${redactDatabaseUrl(rawTestUrl)}). Refusing to run.`);
  }

  if (!TEST_MARKERS.test(identity) && env.TEST_DATABASE_ISOLATED !== "true") {
    throw new Error(
      "TEST_DATABASE_URL does not contain a test/staging marker. Set TEST_DATABASE_ISOLATED=true only after confirming it is a dedicated disposable database.",
    );
  }

  return rawTestUrl;
}

export async function prepareTestDatabase(testDatabaseUrl: string): Promise<Pool> {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const baseTables = await pool.query<{ users: string | null; bookings: string | null; referrals: string | null }>(
    `SELECT
       to_regclass('public.users')::text AS users,
       to_regclass('public.bookings')::text AS bookings,
       to_regclass('public.referrals')::text AS referrals`,
  );
  const tables = baseTables.rows[0];
  if (!tables?.users || !tables.bookings || !tables.referrals) {
    await pool.end();
    throw new Error(
      "The isolated test database is missing the base schema. Initialize it with DATABASE_URL=$TEST_DATABASE_URL npm run db:push, then rerun the tests.",
    );
  }

  const migrationUrl = new URL("../../migrations/0001_referral_system.sql", import.meta.url);
  const migrationSql = await readFile(migrationUrl, "utf8");
  await pool.query(migrationSql);
  return pool;
}

export async function cleanupReferralTestRecords(
  pool: Pool,
  userIds: number[],
  bookingIds: number[],
): Promise<void> {
  if (userIds.length === 0 && bookingIds.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (userIds.length > 0) {
      await client.query(
        "DELETE FROM referrals WHERE referrer_id = ANY($1::int[]) OR referred_user_id = ANY($1::int[])",
        [userIds],
      );
    }
    if (bookingIds.length > 0) {
      await client.query("DELETE FROM booking_photos WHERE booking_id = ANY($1::int[])", [bookingIds]);
      await client.query("DELETE FROM bookings WHERE id = ANY($1::int[])", [bookingIds]);
    }
    if (userIds.length > 0) {
      await client.query("DELETE FROM vehicles WHERE user_id = ANY($1::int[])", [userIds]);
      await client.query("DELETE FROM saved_addresses WHERE user_id = ANY($1::int[])", [userIds]);
      await client.query("DELETE FROM users WHERE id = ANY($1::int[])", [userIds]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
