import { ProviderVerificationRepository } from "../server/provider-verification-repository";
import { ReplitVerificationMediaObjectStore } from "../server/verification-media-object-store";
import { pool } from "../server/db";

const repository = new ProviderVerificationRepository();
const objectStore = new ReplitVerificationMediaObjectStore();
const now = new Date();
const retentionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

const expired = await repository.expiredUploads(now.toISOString());
for (const media of expired) {
  await objectStore.delete(media.objectKey);
  await repository.markAbandoned(media.id, "Upload capability expired before completion.");
  await repository.markObjectDeleted(media.id);
}

const cleanup = await repository.cleanupCandidates(retentionCutoff);
for (const media of cleanup) {
  await objectStore.delete(media.objectKey);
  await repository.markObjectDeleted(media.id);
}

console.log(JSON.stringify({
  expiredUploadsAbandoned: expired.length,
  retainedMetadataObjectsDeleted: cleanup.length,
}));

await pool.end();
