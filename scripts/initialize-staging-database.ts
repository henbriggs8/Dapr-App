import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { assertStagingConfiguration, postgresPoolConfig } from "../server/runtime-policy";

assertStagingConfiguration();
if (process.env.APP_ENV !== "staging" || process.env.CONFIRM_EMPTY_STAGING_DATABASE !== "dapr_staging") {
  throw new Error("Explicit CONFIRM_EMPTY_STAGING_DATABASE=dapr_staging required; never use this on an existing database");
}
const sql = await Promise.all(["0000_staging_baseline.sql", "0001_runtime_invariants.sql"].map(name =>
  readFile(new URL(`../staging/migrations/${name}`, import.meta.url), "utf8")));
const pool = new Pool(postgresPoolConfig());
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(1146114642, 20261026)");
  const result = await client.query(`SELECT current_database() AS name,
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS tables`);
  if (result.rows[0].name !== "dapr_staging" || result.rows[0].tables !== 0) throw new Error("Refusing a nonempty or incorrectly named staging database");
  for (const migration of sql) await client.query(migration);
  const digest = createHash("sha256").update(sql.join("\n")).digest("hex");
  await client.query("INSERT INTO staging_schema_manifest (id, schema_sha256) VALUES (1, $1)", [digest]);
  await client.query("COMMIT");
  console.log(JSON.stringify({ status: "initialized_empty_staging_database", schemaSha256: digest }));
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await pool.end(); }
