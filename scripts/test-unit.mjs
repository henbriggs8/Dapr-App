import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const guard = fileURLToPath(new URL('./unit-network-guard.cjs', import.meta.url));
const tests = readdirSync(new URL('../server/', import.meta.url))
  .filter(name => name.endsWith('.test.ts') && !name.endsWith('.integration.test.ts'))
  .sort()
  .map(name => `server/${name}`);

// Do not pass application credentials or a reachable database to unit tests.
// Database/object-storage integration suites require a separately authorized run.
const env = {
  PATH: process.env.PATH,
  ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unit:unit@127.0.0.1:1/unused',
  STRIPE_SECRET_KEY: 'sk_test_unit_test_only',
  SESSION_SECRET: 'unit-test-session-only',
  BOOKING_NOTIFICATION_DISPATCH_ENABLED: 'false',
  PROVIDER_NOTIFICATION_DISPATCH_ENABLED: 'false',
};

console.log(`Running ${tests.length} unit/mocked test files; integration suites excluded.`);
const result = spawnSync(process.execPath, ['--require', guard, '--import', 'tsx', '--test', ...tests], {
  cwd: root,
  env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
