import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { once } from "node:events";
import { spawn } from "node:child_process";
import express, { type NextFunction, type Request, type Response } from "express";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { Client } from "@replit/object-storage";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (process.env.RUN_PROVIDER_VERIFICATION_STORAGE_INTEGRATION !== "1") {
  throw new Error("Set RUN_PROVIDER_VERIFICATION_STORAGE_INTEGRATION=1 to run this destructive-to-test-data-only integration audit.");
}
if (!process.env.DATABASE_URL) throw new Error("A Replit Development Database URL is required.");
if (!process.env.PHASE2_TEST_JPEG_PATH || !process.env.PHASE2_TEST_VIDEO_PATH) {
  throw new Error("PHASE2_TEST_JPEG_PATH and PHASE2_TEST_VIDEO_PATH are required.");
}
if (process.env.REPLIT_DEPLOYMENT) {
  throw new Error("Refusing to run the integration audit in a Replit deployment.");
}

const auditId = `phase2_audit_${Date.now()}_${randomBytes(4).toString("hex")}`;
const schemaName = auditId.replace(/[^a-z0-9_]/g, "");
const objectPrefix = `${auditId}/`;
const baseDatabaseUrl = process.env.DATABASE_URL;
const basePool = new Pool({ connectionString: baseDatabaseUrl });
const setupClient = await basePool.connect();
const createdObjectKeys = new Set<string>();
let server: ReturnType<typeof createServer> | undefined;
let appPool: { end(): Promise<void> } | undefined;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `--search_path=${schema}`);
  return url.toString();
}

async function runCleanupCommand(databaseUrl: string): Promise<string> {
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/cleanup-provider-application-media.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      VERIFICATION_MEDIA_ENVIRONMENT: auditId,
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += String(chunk); });
  child.stderr.on("data", chunk => { stderr += String(chunk); });
  const [exitCode] = await once(child, "close") as [number];
  assert.equal(exitCode, 0, `Cleanup command failed: ${stderr}`);
  return stdout.trim();
}

try {
  await setupClient.query(`CREATE SCHEMA "${schemaName}"`);
  await setupClient.query(`SET search_path TO "${schemaName}"`);
  await setupClient.query(`CREATE TABLE users (LIKE public.users INCLUDING ALL)`);
  await setupClient.query(`CREATE TABLE provider_applications (LIKE public.provider_applications INCLUDING ALL)`);
  await setupClient.query(await readFile("migrations/0006_provider_application_media.sql", "utf8"));

  const now = new Date().toISOString();
  await setupClient.query(
    `INSERT INTO users (id, username, password, is_provider, is_admin)
     VALUES (910001, 'phase2_audit_owner', 'not-a-login', false, false),
            (910002, 'phase2_audit_other', 'not-a-login', false, false),
            (910003, 'phase2_audit_admin', 'not-a-login', false, true)`,
  );
  const applicationResult = await setupClient.query(
    `INSERT INTO provider_applications
       (user_id, full_name, application_status, created_at, updated_at)
     VALUES (910001, 'Phase 2 Storage Audit', 'verification_requested', $1, $1)
     RETURNING id`,
    [now],
  );
  const applicationId = Number(applicationResult.rows[0].id);

  process.env.DATABASE_URL = withSearchPath(baseDatabaseUrl, schemaName);
  process.env.VERIFICATION_MEDIA_TOKEN_SECRET = randomBytes(48).toString("hex");
  process.env.VERIFICATION_MEDIA_ENVIRONMENT = auditId;
  process.env.NODE_ENV = "development";

  const [
    { registerProviderVerificationRoutes },
    { createVerificationCapability },
    { serializeSafeLogJson },
    { pool },
  ] = await Promise.all([
    import("./provider-verification-routes"),
    import("./provider-verification-capability"),
    import("./log-redaction"),
    import("./db"),
  ]);
  appPool = pool;

  const capturedLogs: string[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const actor = req.get("x-audit-actor");
    if (actor === "owner") (req as any).user = { id: 910001, isAdmin: false, isProvider: false };
    if (actor === "other") (req as any).user = { id: 910002, isAdmin: false, isProvider: false };
    if (actor === "admin") (req as any).user = { id: 910003, isAdmin: true, isProvider: false };
    let responseBody: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as typeof res.json;
    res.once("finish", () => {
      capturedLogs.push(`${req.method} ${req.path} ${res.statusCode} ${serializeSafeLogJson(responseBody)}`);
    });
    next();
  });
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    if (!req.user.isAdmin) return res.status(403).json({ code: "ADMIN_REQUIRED", error: "Admin access required." });
    next();
  };
  registerProviderVerificationRoutes(app, requireAdmin);
  server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(path: string, init: RequestInit = {}, expectedStatus = 200) {
    const response = await fetch(`${baseUrl}${path}`, init);
    assert.equal(response.status, expectedStatus, `${init.method ?? "GET"} ${path} returned ${response.status}`);
    return response;
  }

  async function initiate(mediaType: string, mimeType: string, bytes: Buffer, checksum = sha256(bytes)) {
    const response = await request(
      `/api/provider-applications/${applicationId}/vehicle-verification/uploads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-audit-actor": "owner" },
        body: JSON.stringify({ mediaType, mimeType, fileSizeBytes: bytes.length, checksumSha256: checksum }),
      },
      201,
    );
    return response.json() as Promise<any>;
  }

  async function uploadAndComplete(initiation: any, bytes: Buffer) {
    const invalidUrl = initiation.upload.url.replace(/token=[^&]+/, "token=invalid");
    await request(invalidUrl, {
      method: "PUT",
      headers: {
        "x-audit-actor": "owner",
        "Content-Type": initiation.media.mimeType,
        "Content-Length": String(bytes.length),
      },
      body: bytes,
    }, 401);

    const expiredToken = createVerificationCapability({
      purpose: "upload",
      applicationId,
      mediaId: initiation.media.id,
      actorId: 910001,
      expiresAt: new Date(Date.now() - 1000),
    }, process.env.VERIFICATION_MEDIA_TOKEN_SECRET!);
    await request(
      `/api/provider-applications/${applicationId}/vehicle-verification/uploads/${initiation.media.id}?token=${encodeURIComponent(expiredToken)}`,
      {
        method: "PUT",
        headers: {
          "x-audit-actor": "owner",
          "Content-Type": initiation.media.mimeType,
          "Content-Length": String(bytes.length),
        },
        body: bytes,
      },
      401,
    );

    const uploadedResponse = await request(initiation.upload.url, {
      method: "PUT",
      headers: {
        "x-audit-actor": "owner",
        "Content-Type": initiation.media.mimeType,
        "Content-Length": String(bytes.length),
      },
      body: bytes,
    });
    const uploaded = await uploadedResponse.json() as any;
    assert.equal(uploaded.media.fileSizeBytes, bytes.length);
    assert.equal(uploaded.media.checksumSha256, sha256(bytes));
    assert.equal(uploaded.media.uploadStatus, "uploaded");

    const completeResponse = await request(
      `/api/provider-applications/${applicationId}/vehicle-verification/uploads/${initiation.media.id}/complete`,
      { method: "POST", headers: { "x-audit-actor": "owner" } },
    );
    const completed = await completeResponse.json() as any;
    assert.equal(completed.media.processingStatus, "ready");
    assert.equal(completed.media.isCurrent, true);
    return completed.media;
  }

  const jpeg = await readFile(process.env.PHASE2_TEST_JPEG_PATH);
  const replacementJpeg = Buffer.from(jpeg);
  const video = await readFile(process.env.PHASE2_TEST_VIDEO_PATH);
  assert.equal(jpeg.subarray(0, 3).toString("hex"), "ffd8ff");
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
  const objectClient = new Client();

  await request(`/api/provider-applications/${applicationId}/vehicle-verification/media`, {
    headers: { "x-audit-actor": "other" },
  }, 403);
  await request(`/api/provider-applications/${applicationId}/vehicle-verification/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-audit-actor": "other" },
    body: JSON.stringify({ mediaType: "trunk_photo", mimeType: "image/jpeg", fileSizeBytes: jpeg.length }),
  }, 403);

  const invalidSignatureBytes = Buffer.alloc(jpeg.length);
  invalidSignatureBytes.write("ftypmp42", 4, "ascii");
  const invalidSignatureInitiation = await initiate("trunk_photo", "image/jpeg", invalidSignatureBytes);
  await request(invalidSignatureInitiation.upload.url, {
    method: "PUT",
    headers: {
      "x-audit-actor": "owner",
      "Content-Type": "image/jpeg",
      "Content-Length": String(invalidSignatureBytes.length),
    },
    body: invalidSignatureBytes,
  }, 415);
  const invalidSignatureRow = await setupClient.query(
    `SELECT object_key, upload_status, processing_status
     FROM provider_application_media WHERE id = $1`,
    [invalidSignatureInitiation.media.id],
  );
  assert.equal(invalidSignatureRow.rows[0].upload_status, "failed");
  assert.equal(invalidSignatureRow.rows[0].processing_status, "failed");
  const invalidSignatureObject = await objectClient.exists(invalidSignatureRow.rows[0].object_key);
  assert.equal(invalidSignatureObject.ok && invalidSignatureObject.value, false);

  const badChecksumInitiation = await initiate("trunk_photo", "image/jpeg", jpeg, "0".repeat(64));
  await request(badChecksumInitiation.upload.url, {
    method: "PUT",
    headers: {
      "x-audit-actor": "owner",
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.length),
    },
    body: jpeg,
  }, 422);
  const badChecksumRow = await setupClient.query(
    `SELECT object_key, upload_status FROM provider_application_media WHERE id = $1`,
    [badChecksumInitiation.media.id],
  );
  assert.equal(badChecksumRow.rows[0].upload_status, "failed");
  const badChecksumObject = await objectClient.exists(badChecksumRow.rows[0].object_key);
  assert.equal(badChecksumObject.ok && badChecksumObject.value, false);

  const trunkInitiation = await initiate("trunk_photo", "image/jpeg", jpeg);
  const trunk = await uploadAndComplete(trunkInitiation, jpeg);
  const backSeatInitiation = await initiate("back_seat_photo", "image/jpeg", jpeg);
  const backSeat = await uploadAndComplete(backSeatInitiation, jpeg);
  const videoInitiation = await initiate("walkaround_video", "video/quicktime", video);
  const walkaround = await uploadAndComplete(videoInitiation, video);

  const rowsAfterUpload = await setupClient.query(
    `SELECT id, object_key FROM provider_application_media
     WHERE upload_status = 'uploaded' ORDER BY id`,
  );
  for (const row of rowsAfterUpload.rows) {
    const exists = await objectClient.exists(row.object_key);
    assert.equal(exists.ok && exists.value, true);
    createdObjectKeys.add(row.object_key);
  }

  const reloadResponse = await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media`,
    { headers: { "x-audit-actor": "owner" } },
  );
  const reloaded = await reloadResponse.json() as any;
  assert.equal(reloaded.media.filter((item: any) => item.isCurrent).length, 3);
  assert.equal(reloaded.media.every((item: any) => !("objectKey" in item)), true);

  const replacementResponse = await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media/${trunk.id}/replacements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-audit-actor": "owner" },
      body: JSON.stringify({
        mediaType: "trunk_photo",
        mimeType: "image/jpeg",
        fileSizeBytes: replacementJpeg.length,
        checksumSha256: sha256(replacementJpeg),
      }),
    },
    201,
  );
  const replacementInitiation = await replacementResponse.json() as any;
  const beforeReplacementCompletion = await (await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media`,
    { headers: { "x-audit-actor": "owner" } },
  )).json() as any;
  assert.equal(beforeReplacementCompletion.media.find((item: any) => item.id === trunk.id).isCurrent, true);
  assert.equal(beforeReplacementCompletion.media.find((item: any) => item.id === replacementInitiation.media.id).isCurrent, false);
  let replacement = await uploadAndComplete(replacementInitiation, replacementJpeg);
  const afterReplacementCompletion = await (await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media`,
    { headers: { "x-audit-actor": "owner" } },
  )).json() as any;
  assert.equal(afterReplacementCompletion.media.find((item: any) => item.id === trunk.id).isCurrent, false);
  assert.equal(afterReplacementCompletion.media.find((item: any) => item.id === replacement.id).isCurrent, true);

  const concurrentReplacementRequest = () => request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media/${replacement.id}/replacements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-audit-actor": "owner" },
      body: JSON.stringify({
        mediaType: "trunk_photo",
        mimeType: "image/jpeg",
        fileSizeBytes: replacementJpeg.length,
        checksumSha256: sha256(replacementJpeg),
      }),
    },
    201,
  ).then(response => response.json() as Promise<any>);
  const concurrentInitiations = await Promise.all([
    concurrentReplacementRequest(),
    concurrentReplacementRequest(),
  ]);
  const concurrentState = await (await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media`,
    { headers: { "x-audit-actor": "owner" } },
  )).json() as any;
  const pendingConcurrent = concurrentInitiations.find(item =>
    concurrentState.media.find((media: any) => media.id === item.media.id)?.uploadStatus === "pending");
  const abandonedConcurrent = concurrentInitiations.find(item =>
    concurrentState.media.find((media: any) => media.id === item.media.id)?.uploadStatus === "abandoned");
  assert.ok(pendingConcurrent);
  assert.ok(abandonedConcurrent);
  await request(abandonedConcurrent.upload.url, {
    method: "PUT",
    headers: {
      "x-audit-actor": "owner",
      "Content-Type": "image/jpeg",
      "Content-Length": String(replacementJpeg.length),
    },
    body: replacementJpeg,
  }, 409);
  replacement = await uploadAndComplete(pendingConcurrent, replacementJpeg);
  const postConcurrentState = await (await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/media`,
    { headers: { "x-audit-actor": "owner" } },
  )).json() as any;
  const currentTrunk = postConcurrentState.media.filter((item: any) =>
    item.mediaType === "trunk_photo" && item.isCurrent);
  assert.equal(currentTrunk.length, 1);
  assert.equal(currentTrunk[0].id, replacement.id);

  async function verifySecureView(media: any, expectedBytes: Buffer) {
    const viewUrlResponse = await request(
      `/api/admin/provider-applications/${applicationId}/vehicle-verification/media/${media.id}/view-url`,
      { method: "POST", headers: { "x-audit-actor": "admin" } },
    );
    const view = await viewUrlResponse.json() as any;
    await request(view.url, {}, 401);
    await request(view.url, { headers: { "x-audit-actor": "owner" } }, 403);
    const uploadToken = new URL(trunkInitiation.upload.url, baseUrl).searchParams.get("token")!;
    await request(
      `/api/admin/provider-applications/${applicationId}/vehicle-verification/media/${media.id}/view?token=${encodeURIComponent(uploadToken)}`,
      { headers: { "x-audit-actor": "admin" } },
      403,
    );
    const expiredViewToken = createVerificationCapability({
      purpose: "view",
      applicationId,
      mediaId: media.id,
      actorId: 910003,
      expiresAt: new Date(Date.now() - 1000),
    }, process.env.VERIFICATION_MEDIA_TOKEN_SECRET!);
    await request(
      `/api/admin/provider-applications/${applicationId}/vehicle-verification/media/${media.id}/view?token=${encodeURIComponent(expiredViewToken)}`,
      { headers: { "x-audit-actor": "admin" } },
      401,
    );
    const viewed = await request(view.url, { headers: { "x-audit-actor": "admin" } });
    assert.equal(viewed.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(viewed.headers.get("referrer-policy"), "no-referrer");
    assert.equal(viewed.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await viewed.arrayBuffer()), expectedBytes);
  }
  await verifySecureView(replacement, replacementJpeg);
  await verifySecureView(walkaround, video);

  const submitResponse = await request(
    `/api/provider-applications/${applicationId}/vehicle-verification/submit`,
    { method: "POST", headers: { "x-audit-actor": "owner" } },
  );
  const submitted = await submitResponse.json() as any;
  assert.equal(submitted.application.applicationStatus, "verification_submitted");
  assert.equal(submitted.media.length, 3);

  const leakedToken = [
    new URL(trunkInitiation.upload.url, baseUrl).searchParams.get("token"),
    new URL(videoInitiation.upload.url, baseUrl).searchParams.get("token"),
  ].filter(Boolean) as string[];
  assert.equal(capturedLogs.some(line => leakedToken.some(token => line.includes(token))), false);
  assert.equal(capturedLogs.some(line => line.includes("[REDACTED]")), true);

  const abandoned = await setupClient.query(
    `INSERT INTO provider_application_media
       (application_id, media_type, object_key, mime_type, file_size_bytes,
        upload_status, processing_status, version, is_current, review_status,
        upload_expires_at, created_at, updated_at)
     VALUES ($1, 'back_seat_photo', $2, 'image/jpeg', $3,
             'abandoned', 'pending', 99, false, 'pending',
             $4, $4, $4)
     RETURNING id, object_key`,
    [applicationId, `${objectPrefix}abandoned/test.jpg`, jpeg.length, "2020-01-01T00:00:00.000Z"],
  );
  await objectClient.uploadFromBytes(abandoned.rows[0].object_key, jpeg, { compress: false });
  createdObjectKeys.add(abandoned.rows[0].object_key);
  const trunkObject = rowsAfterUpload.rows.find(row => Number(row.id) === trunk.id)?.object_key;
  assert.ok(trunkObject);
  await setupClient.query(
    `UPDATE provider_application_media
     SET updated_at = '2020-01-01T00:00:00.000Z',
         superseded_at = '2020-01-01T00:00:00.000Z'
     WHERE id = $1`,
    [trunk.id],
  );

  const cleanupOutput = await runCleanupCommand(process.env.DATABASE_URL);
  const cleanupResult = JSON.parse(cleanupOutput);
  assert.ok(cleanupResult.retainedMetadataObjectsDeleted >= 2);
  for (const key of [abandoned.rows[0].object_key, trunkObject]) {
    const exists = await objectClient.exists(key);
    assert.equal(exists.ok && exists.value, false);
    createdObjectKeys.delete(key);
  }
  const cleanedRows = await setupClient.query(
    `SELECT count(*)::int AS count
     FROM provider_application_media
     WHERE id IN ($1, $2) AND object_deleted_at IS NOT NULL`,
    [abandoned.rows[0].id, trunk.id],
  );
  assert.equal(Number(cleanedRows.rows[0].count), 2);

  const allObjects = await objectClient.list({ prefix: objectPrefix });
  if (allObjects.ok) {
    for (const object of allObjects.value) {
      await objectClient.delete(object.name, { ignoreNotFound: true });
      createdObjectKeys.delete(object.name);
    }
  }
  const finalObjects = await objectClient.list({ prefix: objectPrefix });
  assert.equal(finalObjects.ok && finalObjects.value.length, 0);

  console.log(JSON.stringify({
    auditId,
    applicationId,
    uploaded: {
      jpegBytes: jpeg.length,
      videoBytes: video.length,
      trunkChecksum: sha256(jpeg),
      videoChecksum: sha256(video),
    },
    replacement: { oldMediaId: trunk.id, newMediaId: replacement.id },
    realStorageRejections: ["content_signature", "checksum"],
    concurrentReplacementSingleCurrent: true,
    secureViewsVerified: ["image/jpeg", "video/quicktime"],
    capabilityLeakDetected: false,
    cleanup: cleanupResult,
    remainingObjects: 0,
  }));
} finally {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  try {
    const objectClient = new Client();
    const objects = await objectClient.list({ prefix: objectPrefix });
    if (objects.ok) {
      for (const object of objects.value) {
        await objectClient.delete(object.name, { ignoreNotFound: true });
      }
    }
  } catch (error) {
    console.error("Final object cleanup failed:", error);
  }
  if (appPool) await appPool.end();
  await setupClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  setupClient.release();
  await basePool.end();
}
