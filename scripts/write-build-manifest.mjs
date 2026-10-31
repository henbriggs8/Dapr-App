import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const keys = ['VITE_API_BASE_URL','VITE_CLERK_PUBLISHABLE_KEY','VITE_STRIPE_PUBLISHABLE_KEY','VITE_CLERK_ACCOUNT_PORTAL_URL'];
const publicConfigSha256 = createHash('sha256').update(JSON.stringify(keys.map(k=>process.env[k] || ''))).digest('hex');
await writeFile(new URL('../dist/staging-build-manifest.json',import.meta.url),JSON.stringify({publicConfigSha256})+'\n');
