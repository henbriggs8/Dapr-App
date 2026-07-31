import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { Pool, neonConfig } from "@neondatabase/serverless";
import express from "express";
import type { Server } from "node:http";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (process.env.RUN_PROVIDER_SETUP_INTEGRATION !== "1") {
  throw new Error("Set RUN_PROVIDER_SETUP_INTEGRATION=1 to run this destructive-to-test-data-only integration test.");
}
if (process.env.PROVIDER_SETUP_TEST_CONTEXT !== "development") {
  throw new Error("PROVIDER_SETUP_TEST_CONTEXT=development is required.");
}
if (!process.env.PROVIDER_SETUP_TEST_DATABASE_URL) {
  throw new Error("PROVIDER_SETUP_TEST_DATABASE_URL must point to the Replit Development Database.");
}
if (process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run provider setup integration tests in Production.");
}
if (
  process.env.DATABASE_URL
  && process.env.PROVIDER_SETUP_TEST_DATABASE_URL !== process.env.DATABASE_URL
) {
  throw new Error("The integration URL must be the active Replit Development Database URL.");
}
if (
  process.env.PRODUCTION_DATABASE_URL
  && process.env.PROVIDER_SETUP_TEST_DATABASE_URL === process.env.PRODUCTION_DATABASE_URL
) {
  throw new Error("Refusing to use the configured Production Database URL.");
}

const baseDatabaseUrl = process.env.PROVIDER_SETUP_TEST_DATABASE_URL;
const testLabel = `b1_integration_${Date.now()}_${randomBytes(4).toString("hex")}`;
const schemaName = `provider_setup_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
const setupPool = new Pool({ connectionString: baseDatabaseUrl });
const setupClient = await setupPool.connect();
let appPool: { end(): Promise<void> } | undefined;
let httpServer: Server | undefined;

const expectedColumns = [
  "id",
  "application_id",
  "user_id",
  "service_guide_version",
  "service_guide_acknowledged_at",
  "service_area_region",
  "service_area_zip_codes",
  "max_travel_radius",
  "service_area_confirmed_at",
  "training_completed_at",
  "training_completed_by",
  "training_notes",
  "activated_at",
  "created_at",
  "updated_at",
];
const expectedConstraints = [
  "provider_application_setup_pkey",
  "provider_application_setup_application_fk",
  "provider_application_setup_user_fk",
  "provider_application_setup_training_admin_fk",
  "provider_application_setup_radius_check",
  "provider_application_setup_guide_ack_check",
  "provider_application_setup_service_area_check",
  "provider_application_setup_training_check",
];
const expectedIndexes = [
  "provider_application_setup_pkey",
  "provider_application_setup_application_unique",
  "provider_application_setup_user_unique",
];

function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `--search_path=${schema}`);
  return url.toString();
}

async function publicDataFingerprint() {
  const result = await setupClient.query(`
    SELECT
      (SELECT count(*)::integer FROM public.users) AS users_count,
      (SELECT count(*)::integer FROM public.provider_applications) AS applications_count,
      (SELECT count(*)::integer FROM public.provider_application_media) AS media_count,
      (SELECT coalesce(max(updated_at), '') FROM public.provider_applications) AS applications_updated,
      (SELECT coalesce(max(updated_at), '') FROM public.provider_application_media) AS media_updated
  `);
  return result.rows[0];
}

async function insertUser(
  id: number,
  suffix: string,
  isAdmin = false,
  password = "not-a-login",
) {
  await setupClient.query(
    `INSERT INTO users (id, username, password, is_provider, is_admin, current_status)
     VALUES ($1, $2, $3, false, $4, $5)`,
    [id, `${testLabel}_${suffix}`, password, isAdmin, isAdmin ? "offline" : "inactive"],
  );
}

async function insertApplication(id: number, userId: number, suffix: string) {
  const now = new Date().toISOString();
  await setupClient.query(
    `INSERT INTO provider_applications
       (id, user_id, full_name, application_status, created_at, updated_at)
     VALUES ($1, $2, $3, 'approved_needs_setup', $4, $4)`,
    [id, userId, `${testLabel}_${suffix}`, now],
  );
}

async function insertSetup(
  id: number,
  applicationId: number,
  userId: number,
  values: {
    guide?: boolean;
    area?: boolean;
    trainingAdminId?: number;
  },
) {
  const now = new Date().toISOString();
  await setupClient.query(
    `INSERT INTO provider_application_setup
       (id, application_id, user_id, service_guide_version,
        service_guide_acknowledged_at, service_area_region,
        service_area_zip_codes, max_travel_radius, service_area_confirmed_at,
        training_completed_at, training_completed_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)`,
    [
      id,
      applicationId,
      userId,
      values.guide ? "1.0" : null,
      values.guide ? now : null,
      values.area ? "Phoenix Metro" : null,
      values.area ? ["85234"] : null,
      values.area ? 20 : null,
      values.area ? now : null,
      values.trainingAdminId ? now : null,
      values.trainingAdminId ?? null,
      now,
    ],
  );
}

async function insertMedia(
  idBase: number,
  applicationId: number,
  approvedTypes: string[],
) {
  const now = new Date().toISOString();
  for (const [index, mediaType] of [
    "trunk_photo",
    "back_seat_photo",
    "walkaround_video",
  ].entries()) {
    if (!approvedTypes.includes(mediaType)) continue;
    await setupClient.query(
      `INSERT INTO provider_application_media
         (id, application_id, media_type, object_key, mime_type, file_size_bytes,
          checksum_sha256, upload_status, processing_status, version, is_current,
          review_status, upload_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 100, $6, 'uploaded', 'ready', 1, true,
               'approved', $7, $7, $7)`,
      [
        idBase + index,
        applicationId,
        mediaType,
        `${schemaName}/${applicationId}/${mediaType}`,
        mediaType === "walkaround_video" ? "video/mp4" : "image/jpeg",
        "a".repeat(64),
        now,
      ],
    );
  }
}

async function assertNotActivated(applicationId: number, userId: number) {
  const result = await setupClient.query(
    `SELECT a.application_status, u.is_provider, u.current_status, s.activated_at
       FROM provider_applications a
       JOIN users u ON u.id = a.user_id
       JOIN provider_application_setup s ON s.application_id = a.id
      WHERE a.id = $1 AND u.id = $2`,
    [applicationId, userId],
  );
  assert.equal(result.rows[0].application_status, "approved_needs_setup");
  assert.equal(result.rows[0].is_provider, false);
  assert.equal(result.rows[0].current_status, "inactive");
  assert.equal(result.rows[0].activated_at, null);
}

const publicFingerprintBefore = await publicDataFingerprint();
let schemaCreated = false;

try {
  await setupClient.query(`CREATE SCHEMA "${schemaName}"`);
  schemaCreated = true;
  await setupClient.query(`SET search_path TO "${schemaName}"`);
  await setupClient.query(`CREATE TABLE users (LIKE public.users INCLUDING ALL)`);
  await setupClient.query(`CREATE TABLE provider_applications (LIKE public.provider_applications INCLUDING ALL)`);
  await setupClient.query(`CREATE TABLE provider_application_media (LIKE public.provider_application_media INCLUDING ALL)`);

  const objectsBeforeMigration = await setupClient.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 ORDER BY table_name`,
    [schemaName],
  );
  assert.deepEqual(
    objectsBeforeMigration.rows.map(row => row.table_name),
    ["provider_application_media", "provider_applications", "users"],
  );

  const migration = await readFile("migrations/0007_provider_setup.sql", "utf8");
  await setupClient.query(migration);

  const columns = await setupClient.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'provider_application_setup'
      ORDER BY ordinal_position`,
    [schemaName],
  );
  assert.deepEqual(columns.rows.map(row => row.column_name), expectedColumns);

  const constraints = await setupClient.query(
    `SELECT conname FROM pg_constraint
      WHERE connamespace = $1::regnamespace
        AND conrelid = $2::regclass
      ORDER BY conname`,
    [schemaName, `${schemaName}.provider_application_setup`],
  );
  assert.deepEqual(
    constraints.rows.map(row => row.conname).sort(),
    [...expectedConstraints].sort(),
  );

  const indexes = await setupClient.query(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = $1 AND tablename = 'provider_application_setup'
      ORDER BY indexname`,
    [schemaName],
  );
  assert.deepEqual(
    indexes.rows.map(row => row.indexname).sort(),
    [...expectedIndexes].sort(),
  );

  const foreignKeys = await setupClient.query(
    `SELECT conname, confrelid::regclass::text AS target
       FROM pg_constraint
      WHERE connamespace = $1::regnamespace
        AND conrelid = $2::regclass
        AND contype = 'f'
      ORDER BY conname`,
    [schemaName, `${schemaName}.provider_application_setup`],
  );
  assert.deepEqual(foreignKeys.rows, [
    { conname: "provider_application_setup_application_fk", target: "provider_applications" },
    { conname: "provider_application_setup_training_admin_fk", target: "users" },
    { conname: "provider_application_setup_user_fk", target: "users" },
  ]);

  const objectsAfterMigration = await setupClient.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 ORDER BY table_name`,
    [schemaName],
  );
  assert.deepEqual(
    objectsAfterMigration.rows.map(row => row.table_name),
    [
      "provider_application_media",
      "provider_application_setup",
      "provider_applications",
      "users",
    ],
  );

  await setupClient.query(`
    CREATE TABLE activation_audit (application_id integer NOT NULL, activated_at text NOT NULL);
    CREATE FUNCTION audit_provider_activation() RETURNS trigger AS $$
    BEGIN
      IF OLD.application_status IS DISTINCT FROM 'active_provider'
         AND NEW.application_status = 'active_provider' THEN
        INSERT INTO activation_audit (application_id, activated_at)
        VALUES (NEW.id, NEW.updated_at);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER provider_activation_audit
      AFTER UPDATE ON provider_applications
      FOR EACH ROW EXECUTE FUNCTION audit_provider_activation();
  `);

  process.env.DATABASE_URL = withSearchPath(baseDatabaseUrl, schemaName);
  process.env.SESSION_SECRET ||= randomBytes(32).toString("hex");
  const [
    { ProviderSetupRepository },
    { pool },
    { hashPassword },
    { registerRoutes },
  ] = await Promise.all([
    import("./provider-setup-repository"),
    import("./db"),
    import("./auth"),
    import("./routes"),
  ]);
  appPool = pool;
  const testPassword = `B1-only-${randomBytes(12).toString("hex")}`;
  const providerUsername = `${testLabel}_provider`;
  await insertUser(920001, "provider", false, await hashPassword(testPassword));
  await insertUser(920002, "incomplete_provider");
  await insertUser(920003, "missing_media_provider");
  await insertUser(920004, "unapproved_media_provider");
  await insertUser(920099, "admin", true);

  await insertApplication(930001, 920001, "concurrent_application");
  await insertSetup(940001, 930001, 920001, { area: true });
  await insertMedia(950001, 930001, [
    "trunk_photo",
    "back_seat_photo",
    "walkaround_video",
  ]);

  await insertApplication(930002, 920002, "incomplete_setup_application");
  await insertSetup(940002, 930002, 920002, {
    guide: true,
    trainingAdminId: 920099,
  });
  await insertMedia(950011, 930002, [
    "trunk_photo",
    "back_seat_photo",
    "walkaround_video",
  ]);

  await insertApplication(930003, 920003, "missing_media_application");
  await insertSetup(940003, 930003, 920003, { guide: true, area: true });
  await insertMedia(950021, 930003, ["trunk_photo", "back_seat_photo"]);

  await insertApplication(930004, 920004, "unapproved_media_application");
  await insertSetup(940004, 930004, 920004, { guide: true, area: true });
  await insertMedia(950031, 930004, [
    "trunk_photo",
    "back_seat_photo",
    "walkaround_video",
  ]);
  await setupClient.query(
    `UPDATE provider_application_media
        SET review_status = 'pending'
      WHERE application_id = 930004 AND media_type = 'walkaround_video'`,
  );

  const repository = new ProviderSetupRepository();

  const app = express();
  app.use(express.json());
  httpServer = registerRoutes(app);
  httpServer.listen(0, "127.0.0.1");
  await once(httpServer, "listening");
  const address = httpServer.address();
  assert.ok(address && typeof address === "object");
  const baseURL = `http://127.0.0.1:${address.port}`;
  const loginResponse = await fetch(`${baseURL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: providerUsername, password: testPassword }),
  });
  assert.equal(loginResponse.status, 200);
  const sessionCookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(sessionCookie, "The isolated provider login must create a session.");
  let providerMeResponse = await fetch(`${baseURL}/api/provider/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(providerMeResponse.status, 403, "Provider access must fail before valid activation.");

  const providerBeforeActivation = await setupClient.query(
    `SELECT is_provider FROM users WHERE id = 920001`,
  );
  assert.equal(providerBeforeActivation.rows[0].is_provider, false);

  const [guideResult, trainingResult] = await Promise.all([
    repository.acknowledgeServiceGuide(930001, 920001, "1.0"),
    repository.completeTraining(930001, 920099, "Passed controlled test job."),
  ]);
  assert.ok(
    [guideResult.application.applicationStatus, trainingResult.application.applicationStatus]
      .includes("active_provider"),
  );

  const application = await setupClient.query(
    `SELECT application_status FROM provider_applications WHERE id = 930001`,
  );
  const provider = await setupClient.query(
    `SELECT is_provider, current_status FROM users WHERE id = 920001`,
  );
  const setup = await setupClient.query(
    `SELECT activated_at, training_completed_by FROM provider_application_setup WHERE application_id = 930001`,
  );
  const audit = await setupClient.query(
    `SELECT count(*)::integer AS count FROM activation_audit WHERE application_id = 930001`,
  );
  assert.equal(application.rows[0].application_status, "active_provider");
  assert.equal(provider.rows[0].is_provider, true);
  assert.equal(provider.rows[0].current_status, "offline");
  assert.ok(setup.rows[0].activated_at);
  assert.equal(Number(setup.rows[0].training_completed_by), 920099);
  assert.equal(Number(audit.rows[0].count), 1, "Concurrent final steps must activate exactly once.");
  providerMeResponse = await fetch(`${baseURL}/api/provider/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert.equal(providerMeResponse.status, 200, "Provider access must succeed after valid activation.");
  const providerProfile = await providerMeResponse.json() as {
    isProvider: boolean;
    currentStatus: string;
  };
  assert.equal(providerProfile.isProvider, true);
  assert.equal(providerProfile.currentStatus, "offline");

  const repeated = await repository.completeTraining(930001, 920099, "Ignored repeat.");
  assert.equal(repeated.application.applicationStatus, "active_provider");
  const repeatedAudit = await setupClient.query(
    `SELECT count(*)::integer AS count FROM activation_audit WHERE application_id = 930001`,
  );
  assert.equal(Number(repeatedAudit.rows[0].count), 1, "Repeated completion must be idempotent.");

  await repository.acknowledgeServiceGuide(930002, 920002, "1.0");
  await assertNotActivated(930002, 920002);

  await repository.completeTraining(930003, 920099, "Training complete; media intentionally incomplete.");
  await assertNotActivated(930003, 920003);

  await repository.completeTraining(930004, 920099, "Training complete; one media item intentionally pending.");
  await assertNotActivated(930004, 920004);

  const { ADMIN_ALLOWED_TRANSITIONS } = await import("@shared/schema");
  assert.equal(
    Object.values(ADMIN_ALLOWED_TRANSITIONS)
      .some(transitions => transitions.includes("active_provider")),
    false,
    "No direct admin lifecycle transition may target active_provider.",
  );

  assert.equal(providerBeforeActivation.rows[0].is_provider, false);
  assert.equal(provider.rows[0].is_provider, true);
  console.log(`Provider setup integration test passed in isolated schema ${schemaName}.`);
} finally {
  if (httpServer?.listening) {
    httpServer.close();
    await once(httpServer, "close").catch(() => undefined);
  }
  await appPool?.end().catch(() => undefined);
  if (schemaCreated) {
    await setupClient.query(`RESET search_path`).catch(() => undefined);
    await setupClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    const remainingSchema = await setupClient.query(
      `SELECT count(*)::integer AS count FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName],
    );
    assert.equal(Number(remainingSchema.rows[0].count), 0, "Temporary schema cleanup must complete.");
  }
  const labeledRecords = await setupClient.query(
    `SELECT
       (SELECT count(*)::integer FROM public.users WHERE username LIKE $1) AS users_count,
       (SELECT count(*)::integer FROM public.provider_applications WHERE full_name LIKE $1) AS applications_count`,
    [`${testLabel}%`],
  );
  assert.deepEqual(labeledRecords.rows[0], { users_count: 0, applications_count: 0 });
  const publicFingerprintAfter = await publicDataFingerprint();
  assert.deepEqual(
    publicFingerprintAfter,
    publicFingerprintBefore,
    "Development public application data changed during the isolated test.",
  );
  setupClient.release();
  await setupPool.end();
}
