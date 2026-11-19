# Revised staging catalog: preparation and approvals

The native visual direction is approved at `henbriggs8/Dapr-Customer-iOS@79a34e158c18d1988540eb2051d98311fe143e6b`. This records visual approval only. Database execution, deployment, merges and App Store submission are not authorized.

## Source to review

- Backend functional catalog: `21b605eb73ad6be1dc9f5ec9144015aa5304fe43`, on `codex/two-service-catalog-2026-11-18`, stacked on PR #19 at `2cad2ec30493bc4035daf455dba5460bc3d8ca21`.
- Review the complete current backend PR head, including this plan and the generated transaction. Record that full SHA in the eventual execution approval. No merge is needed to review or later execute an explicitly approved, frozen source revision.
- The iOS commit is a companion client revision, not a prerequisite for creating database tables. No native runtime secrets belong in the backend or this bundle.
- PR #18 alone retains the recovered historical compensation behavior. The revised catalog must use the descendant containing PR #19's canonical 65/35 accounting; do not combine it with #18 alone.

## Catalog and schema

| Service | Customer price | Duration | Availability |
| --- | --- | --- | --- |
| Essential Wash | $39 | 30 minutes | Bookable |
| Refresh Detail | $149 | 90 minutes | Bookable |
| Dapr Black Label Detail | Hidden | Coming Soon | Not bookable |

Seed exactly three service rows, and no Interior Detail row. The `services` schema has required numeric price/duration columns and no availability/status columns. Black Label retains internal legacy numeric fields for decoding/history; API `displayPrice` is null and the native/web selectors suppress its price. Bookability is enforced by backend policy, not by a new column or only a UI flag.

Interior and premium cannot create new quotes or bookings, including ASAP/legacy paths and unconsumed stale quotes. Previously created bookings remain idempotently readable. Existing Interior/duplicate service rows and historical references are never deleted or repointed by the catalog code. This initialization bundle is for a new empty database only and refuses any existing application relations.

The existing migrations remain unchanged:

1. `staging/migrations/0000_staging_baseline.sql`
2. `staging/migrations/0001_runtime_invariants.sql`

Combined schema SHA-256: `fe58e1a3edfa952c65fe1523383a9df99008a33ffe779cf272bd7fb7b8f35425`.

## Offline preparation — no database connection

`npm run db:staging:prepare` produces `revised-catalog-initialization.sql` and its JSON manifest using the actual canonical catalog and the two exact migration files. It does not import a database driver, read environment credentials, open a connection, initialize a database or start the app.

`npm run db:staging:plan:check` verifies that those files still match their source. It is safe for automatic CI. It is not a SQL execution rehearsal and must not be represented as one.

The composed transaction has not been run. Earlier disposable PostgreSQL 18.6 integration results cover the component schema, catalog storage path, booking restrictions, historical references and finalized earnings; they do not attest this newly composed execution artifact. Obtain explicit approval for a disposable rehearsal before using it on persistent staging.

## Exact target and protected resources

- Railway project `Dapr.`: `3f646fec-82ed-49c9-94e5-e0b938dd2346`.
- Environment `staging`: `53cc8851-23dc-4bf4-9b9b-00d51775b8ed`.
- Existing Postgres service: `3737d3b6-3401-4adf-acc7-941b4b9ffa36`.
- Database `dapr_staging`, private hostname `postgres.railway.internal`.
- Use the existing private database console/session. Do not create a public TCP proxy, new service/database, paid resource or API deployment merely to run initialization.
- Do not touch Railway production, Replit production or Dapr Legacy DB. SQL can verify the database name and emptiness, but cannot attest the Railway project/environment; verify the displayed resource IDs before connecting.

## Ordered gates for later execution

1. **Source review:** verify the reviewed backend head SHA, generated SQL SHA-256 and unchanged schema fingerprint. Passing CI must include the offline artifact check, typecheck, unit/security tests, production build, dependency audit and Linux image build. A skipped database CI job is not a database pass.
2. **Authorized rehearsal:** on a newly authorized disposable local PostgreSQL 18.6 database, rehearse this exact transaction and its refusal of a wrong/nonempty target. Stop/remove the disposable database afterward. No such database is created by this preparation task.
3. **Fresh read-only target preflight:** verify the exact project/environment/service IDs, private connection and `current_database() = 'dapr_staging'`. Confirm there are no application tables, sequences or views in any user schema. Previous empty-table observations are historical, not a substitute for this fresh check.
4. **Database-only authorization:** obtain approval naming the full backend SHA and bundle hash. Keep the pending API patch and `STAGING_ISOLATION_CONFIRMED` application hold unchanged. The private SQL transaction requires no Clerk, Stripe, Firebase, Resend or storage credential.
5. **Execute only the reviewed transaction:** stop on any SQL error. It takes the existing advisory lock, checks emptiness before DDL, creates the unchanged schema, records its fingerprint, inserts the three canonical rows and verifies all postconditions before COMMIT. Do not run a broad Drizzle push, seed users, generate bookings or call the old two-step initializer in addition to this bundle.
6. **Verify:** exactly 20 expected tables; one schema manifest with the expected hash; exactly three service rows with the expected definitions; exactly two bookable categories; no Interior row; every other table empty. Capture only schema/catalog metadata, never credentials.
7. **Stop:** do not start the API, apply Railway settings, create test accounts or exercise payments. Those actions require separate authorization.

## Rollback and stop conditions

Any failed precondition or postcondition aborts the single transaction. Explicitly ROLLBACK on an error; do not ignore errors or treat an aborted COMMIT as success. Do not delete pre-existing objects, drop tables or reset any database to make the script pass. If the connection is interrupted or the outcome is uncertain, reconnect read-only and inspect the schema manifest/table counts before proposing another action. After a confirmed successful commit, any removal/reset requires separate approval.

## API and native follow-up

Railway currently has 42 pending API changes aimed at the older PR #19 branch, not this catalog branch. Leave them unapplied. Before a future deployment, authorize selection of the reviewed catalog-inclusive backend SHA/branch, rebuild the corresponding container, and recheck isolated credentials and storage/database references.

The native app decodes the additive metadata and uses its existing SwiftUI components. Wire-format compatibility is tested; a live staging API/native session is not certified while the API remains undeployed. Use only Clerk Development and Stripe Sandbox publishable keys in a future isolated native test build. Preserve the normal app's approved release capabilities and light mode; do not point the installed production app at staging.

The normal native application's delegate still initializes Firebase. API/Clerk/Stripe overrides alone do not isolate that client-side integration. A separately prepared nonproduction connected test build must skip Firebase initialization and avoid overwriting an installed production app. The offline visual fixture already disables Firebase but bypasses real authentication/payments, so it cannot certify a connected staging session.

Firebase/Resend must remain disabled. The previously observed active Stripe Sandbox destination pointing at Replit requires a separate owner decision before payment tests; this preparation does not change it. Preserve the 65% Provider / 35% Dapr model based on the full saved quote, Dapr-funded discounts and persisted finalized earnings, including zero.
