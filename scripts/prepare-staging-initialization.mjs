// Offline preparation only. This script never imports a database driver,
// reads credentials, opens a connection, or executes the SQL it produces.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { CANONICAL_SERVICE_CATALOG, bookableServices, catalogService } from '../shared/service-catalog.ts';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) throw new Error('Only --check is supported');
const check = args.includes('--check');
const root = new URL('../', import.meta.url);
const files = ['staging/migrations/0000_staging_baseline.sql', 'staging/migrations/0001_runtime_invariants.sql'];
const migrations = await Promise.all(files.map(file => readFile(new URL(file, root), 'utf8')));
const hash = value => createHash('sha256').update(value).digest('hex');
const schemaSha256 = hash(migrations.join('\n'));
const catalog = CANONICAL_SERVICE_CATALOG.map((service, index) => ({ ...service, id: index + 1 }));
assert.deepEqual(bookableServices(catalog).map(s => [s.name, s.price, s.duration]), [
  ['Essential Wash', 39, 30], ['Refresh Detail', 149, 90],
]);
assert.equal(catalog.length, 3);
assert.equal(catalogService(catalog[2], catalog).bookingAvailability, 'coming_soon');
assert.equal(catalogService(catalog[2], catalog).displayPrice, null);
const tableNames = [...migrations.join('\n').matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+"?([a-z_]+)"?\s*\(/g)].map(match => match[1]).sort();
assert.equal(tableNames.length, 20);
assert.equal(new Set(tableNames).size, 20);
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const tuples = catalog.map(s => `  (${quote(s.name)}, ${quote(s.description)}, ${s.price}, ${s.duration}, ${quote(s.category)})`).join(',\n');
const expectedTuples = catalog.map(s => `(${quote(s.name)}, ${s.price}, ${s.duration}, ${quote(s.category)})`).join(',\n      ');
const zeroRowTables = tableNames.filter(name => !['services', 'staging_schema_manifest'].includes(name));
const sql = `-- PREPARED FOR REVIEW ONLY. Separate database-only approval is required.
-- Target: Dapr. / staging / Postgres / dapr_staging, private console only.
-- Project: 3f646fec-82ed-49c9-94e5-e0b938dd2346
-- Environment: 53cc8851-23dc-4bf4-9b9b-00d51775b8ed
-- Postgres service: 3737d3b6-3401-4adf-acc7-941b4b9ffa36
-- The operator must verify these Railway identities; SQL cannot attest them.
-- No API deploy, pending configuration application, account or booking seed.
-- Run the entire reviewed transaction together with stop-on-error enabled.
-- Schema source SHA-256: ${schemaSha256}
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_catalog;
SELECT pg_advisory_xact_lock(1146114642, 20261026);
DO $dapr_preflight$
BEGIN
  IF current_database() <> 'dapr_staging' THEN
    RAISE EXCEPTION 'Refusing a database other than dapr_staging';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname <> 'information_schema' AND n.nspname !~ '^pg_'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  ) THEN
    RAISE EXCEPTION 'Refusing a nonempty database; inspect it without deleting anything';
  END IF;
END;
$dapr_preflight$;

-- Exact existing schema, without new availability/status columns.
${migrations.join('\n')}

INSERT INTO public.staging_schema_manifest (id, schema_sha256)
VALUES (1, ${quote(schemaSha256)});

-- services.price/duration remain numeric for the legacy contract. Premium
-- values are internal only: customer displayPrice is null and booking is denied.
INSERT INTO public.services (name, description, price, duration, category) VALUES
${tuples};

DO $dapr_postconditions$
DECLARE
  relation_name text;
  row_count bigint;
BEGIN
  IF (SELECT array_agg(table_name::text ORDER BY table_name)
      FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE')
      IS DISTINCT FROM ARRAY[${tableNames.map(quote).join(', ')}]::text[] THEN
    RAISE EXCEPTION 'Unexpected schema table manifest';
  END IF;
  IF (SELECT count(*) FROM public.services) <> 3
    OR (SELECT count(DISTINCT category) FROM public.services) <> 3
    OR EXISTS (SELECT 1 FROM public.services
      WHERE (name, price, duration, category) NOT IN (
      ${expectedTuples}
      )) THEN
    RAISE EXCEPTION 'Unexpected catalog';
  END IF;
  IF (SELECT count(*) FROM public.staging_schema_manifest) <> 1
    OR NOT EXISTS (SELECT 1 FROM public.staging_schema_manifest
      WHERE id = 1 AND schema_sha256 = ${quote(schemaSha256)}) THEN
    RAISE EXCEPTION 'Unexpected schema fingerprint';
  END IF;
  FOR relation_name IN SELECT unnest(ARRAY[${zeroRowTables.map(quote).join(', ')}]::text[]) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', relation_name) INTO row_count;
    IF row_count <> 0 THEN
      RAISE EXCEPTION 'Expected no records in %', relation_name;
    END IF;
  END LOOP;
END;
$dapr_postconditions$;

SELECT name, category,
  CASE WHEN category IN ('basic', 'standard') THEN price ELSE NULL END AS display_price,
  CASE WHEN category IN ('basic', 'standard') THEN duration ELSE NULL END AS bookable_duration_minutes,
  category IN ('basic', 'standard') AS is_bookable,
  CASE WHEN category = 'premium' THEN 'coming_soon' ELSE 'available' END AS booking_availability
FROM public.services ORDER BY id;
SELECT schema_sha256 FROM public.staging_schema_manifest WHERE id = 1;
COMMIT;
`;
const manifest = {
  status: 'PREPARED_REQUIRES_SEPARATE_DATABASE_APPROVAL',
  executionRehearsal: 'NOT_RUN_FOR_THIS_COMPOSED_TRANSACTION',
  target: { projectId: '3f646fec-82ed-49c9-94e5-e0b938dd2346', environmentId: '53cc8851-23dc-4bf4-9b9b-00d51775b8ed', serviceId: '3737d3b6-3401-4adf-acc7-941b4b9ffa36', database: 'dapr_staging', privateHost: 'postgres.railway.internal' },
  operatorMustVerifyRailwayIdentity: true,
  schemaFiles: files, schemaSha256,
  catalogSourceSha256: hash(await readFile(new URL('shared/service-catalog.ts', root))),
  sqlFile: 'staging/revised-catalog-initialization.sql', sqlSha256: hash(sql),
  expectedTables: tableNames,
  expectedRows: { services: 3, staging_schema_manifest: 1, everyOtherTable: 0 },
  expectedBookableServices: 2,
  catalog: catalog.map(s => catalogService(s, catalog)),
  flagsAreApplicationPolicyNotDatabaseColumns: true,
  noExistingDataUpdatesOrDeletes: true,
  rollback: 'Any failed pre/postcondition aborts the single transaction; explicitly ROLLBACK on error. Do not delete existing tables or retry against a nonempty target.',
};
for (const [file, content] of [['staging/revised-catalog-initialization.sql', sql], ['staging/revised-catalog-initialization.json', JSON.stringify(manifest, null, 2) + '\n']]) {
  if (check) assert.equal(await readFile(new URL(file, root), 'utf8'), content, `${file} is stale; regenerate and review`);
  else await writeFile(new URL(file, root), content);
}
console.log(JSON.stringify({ status: check ? 'preparation_artifacts_match_source' : 'prepared_files_only', schemaSha256, sqlSha256: manifest.sqlSha256, databaseConnections: 0, databaseWrites: 0 }));
