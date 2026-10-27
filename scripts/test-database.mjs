import { readdir, readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { Pool } from 'pg';

// This runner only accepts a new empty, disposable, loopback database.
const url = new URL(process.env.TEST_DATABASE_URL || 'invalid:');
if (process.env.TEST_DATABASE_ISOLATED !== 'true' || !['postgres:', 'postgresql:'].includes(url.protocol)
  || !['127.0.0.1', 'localhost'].includes(url.hostname) || !/^\/dapr_test_[a-z0-9_]+$/.test(url.pathname)
  || process.env.RAILWAY_PROJECT_ID || process.env.REPLIT_DEPLOYMENT) throw new Error('Require a dedicated loopback dapr_test_* TEST_DATABASE_URL and TEST_DATABASE_ISOLATED=true');
const pool = new Pool({ connectionString: url.href });
const count = await pool.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
if (count.rows[0].count !== 0) { await pool.end(); throw new Error('Refusing a nonempty database; create a NEW disposable database for each run'); }
const root = new URL('../', import.meta.url);
const files = (await readdir(new URL('../server/', import.meta.url))).filter(n => n.endsWith('.integration.test.ts')).sort();
const schema = await Promise.all(['0000_staging_baseline.sql', '0001_runtime_invariants.sql'].map(n => readFile(new URL(`../staging/migrations/${n}`, import.meta.url), 'utf8')));
const scratch = await mkdtemp(join(tmpdir(), 'dapr-database-fixtures-'));
await writeFile(join(scratch, 'synthetic.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(0)]));
await writeFile(join(scratch, 'synthetic.mp4'), Buffer.concat([Buffer.from([0,0,0,24]), Buffer.from('ftypisom'), Buffer.alloc(64)]));
// Minimal local S3 protocol double; validates real SDK requests without a cloud account.
// This is not certification of Railway's S3 service or multipart delivery.
const objects = new Map();
const mockS3 = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost'); const key = decodeURIComponent(u.pathname).replace(/^\/dapr-test-bucket\//, '');
  if (req.method === 'GET' && u.searchParams.has('list-type')) {
    const prefix = u.searchParams.get('prefix') || '';
    res.setHeader('content-type', 'application/xml');
    const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
    res.end('<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated>' + [...objects.keys()].filter(k=>k.startsWith(prefix)).map(k=>`<Contents><Key>${escape(k)}</Key><Size>${objects.get(k).length}</Size></Contents>`).join('')+'</ListBucketResult>'); return;
  }
  if (req.method === 'PUT') {
    const chunks=[]; for await (const c of req) chunks.push(c);
    objects.set(key, Buffer.concat(chunks)); res.setHeader('ETag', '"local-test"'); res.end(); return;
  }
  if (req.method === 'DELETE') { objects.delete(key); res.statusCode=204; res.end(); return; }
  if (!objects.has(key)) { res.statusCode=404; res.end('<Error><Code>NoSuchKey</Code></Error>'); return; }
  res.setHeader('content-length', String(objects.get(key).length));
  res.end(req.method === 'HEAD' ? undefined : objects.get(key));
});
mockS3.listen(0, '127.0.0.1'); await once(mockS3, 'listening');
let failed = 0;
try {
  for (const name of files) {
    // Only this process owns this initially empty disposable DB. Never use application/staging URLs here.
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    for (const sql of schema) await pool.query(sql);
    const env = { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR || tmpdir(), NODE_ENV: 'test', APP_ENV: 'test',
      RUN_ISOLATED_DB_TESTS: 'true', TEST_DATABASE_ISOLATED: 'true', TEST_DATABASE_URL: url.href,
      STRIPE_SECRET_KEY: 'sk_test_unit_test_only', SESSION_SECRET: 'isolated-tests-not-a-live-session-secret',
      BOOKING_NOTIFICATION_DISPATCH_ENABLED: 'false', PROVIDER_NOTIFICATION_DISPATCH_ENABLED: 'false', OUTBOUND_DELIVERY_MODE: 'disabled',
      RUN_PROVIDER_SETUP_INTEGRATION: '1', PROVIDER_SETUP_TEST_CONTEXT: 'development', PROVIDER_SETUP_TEST_DATABASE_URL: url.href,
      RUN_PROVIDER_VERIFICATION_STORAGE_INTEGRATION: '1', PHASE2_TEST_JPEG_PATH: join(scratch,'synthetic.jpg'), PHASE2_TEST_VIDEO_PATH: join(scratch,'synthetic.mp4'),
      VERIFICATION_MEDIA_BACKEND: 's3', S3_ENDPOINT: `http://127.0.0.1:${mockS3.address().port}`, S3_BUCKET: 'dapr-test-bucket',
      S3_REGION: 'us-east-1', S3_ACCESS_KEY_ID: 'fixture', S3_SECRET_ACCESS_KEY: 'fixture', S3_FORCE_PATH_STYLE: 'true',
      NODE_OPTIONS: '--require=' + JSON.stringify(fileURLToPath(new URL('./unit-network-guard.cjs', import.meta.url))) };
    if (!['referrals.integration.test.ts','arrive-now.integration.test.ts'].includes(name)) env.DATABASE_URL = url.href;
    const child = spawn(process.execPath, ['--import','tsx',`server/${name}`], {cwd: root, env, stdio:'inherit'});
    const deadline = setTimeout(()=>child.kill('SIGTERM'), 90_000);
    const [code] = await once(child, 'exit'); clearTimeout(deadline);
    console.log(JSON.stringify({suite:name,exitCode:code}));
    if (code !== 0) failed++;
  }
} finally {
  await pool.end(); mockS3.closeAllConnections(); await new Promise(r=>mockS3.close(r)); await rm(scratch,{recursive:true,force:true});
}
console.log(JSON.stringify({suites:files.length,failed,storage:'local protocol double; real cloud service not exercised'}));
process.exitCode = failed ? 1 : 0;
