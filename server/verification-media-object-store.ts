import { Client } from "@replit/object-storage";
import type { Readable } from "node:stream";

export interface VerificationMediaObjectStore {
  upload(objectKey: string, stream: Readable): Promise<void>;
  download(objectKey: string): Readable;
  exists(objectKey: string): Promise<boolean>;
  delete(objectKey: string): Promise<void>;
}

function objectStorageError(operation: string, error: unknown): Error {
  const message = typeof error === "object" && error && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error);
  return new Error(`Private object storage ${operation} failed: ${message}`);
}

export class ReplitVerificationMediaObjectStore implements VerificationMediaObjectStore {
  private readonly client: Client;

  constructor(bucketId = process.env.VERIFICATION_MEDIA_BUCKET_ID) {
    if (process.env.NODE_ENV === "production" && !bucketId) {
      throw new Error("VERIFICATION_MEDIA_BUCKET_ID must be configured in production.");
    }
    this.client = new Client(bucketId ? { bucketId } : undefined);
  }

  async upload(objectKey: string, stream: Readable): Promise<void> {
    await this.client.uploadFromStream(objectKey, stream, { compress: false });
  }

  download(objectKey: string): Readable {
    return this.client.downloadAsStream(objectKey, { decompress: false });
  }

  async exists(objectKey: string): Promise<boolean> {
    const result = await this.client.exists(objectKey);
    if (!result.ok) throw objectStorageError("existence check", result.error);
    return result.value;
  }

  async delete(objectKey: string): Promise<void> {
    const result = await this.client.delete(objectKey, { ignoreNotFound: true });
    if (!result.ok) throw objectStorageError("delete", result.error);
  }
}
