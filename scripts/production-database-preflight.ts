import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";

async function main() {
  const result = await db.execute(sql`
    SELECT
      md5(current_database()) AS database_fingerprint,
      current_schema() AS schema_name,
      (SELECT count(*)::int FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN ('bookings', 'users', 'notification_events')) AS expected_table_count,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'bookings'
      )) AS bookings_present,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'users'
      )) AS users_present,
      (SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'notification_events'
      )) AS notification_events_present
  `);
  console.log(JSON.stringify(result.rows[0]));
}

main()
  .catch(error => {
    console.error("Database preflight failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });