import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export interface VerificationMediaObjectStore {
  upload(objectKey: string, stream: Readable): Promise<void>;
  download(objectKey: string): Readable;
  exists(objectKey: string): Promise<boolean>;
  delete(objectKey: string): Promise<void>;
}

export class S3VerificationMediaObjectStore implements VerificationMediaObjectStore {
  readonly client: S3Client;
  readonly bucket: string;
  private readonly namespace: string | undefined;
  constructor(env: NodeJS.ProcessEnv = process.env) {
    for (const key of ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
      if (!env[key]) throw new Error(`Private S3 storage requires ${key}`);
    }
    const endpoint = new URL(env.S3_ENDPOINT!);
    if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost"].includes(endpoint.hostname) && env.NODE_ENV === "test")) {
      throw new Error("S3 storage requires HTTPS (loopback HTTP permitted in tests only)");
    }
    this.bucket = env.S3_BUCKET!;
    this.namespace = env.APP_ENV === "staging" ? "staging/" : undefined;
    this.client = new S3Client({ endpoint: endpoint.href, region: env.S3_REGION!,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true", maxAttempts: 3,
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! } });
  }
  private key(objectKey: string) {
    if (!objectKey || objectKey.startsWith("/") || objectKey.split("/").includes("..")) throw new Error("Invalid object key");
    if (this.namespace && !objectKey.startsWith(this.namespace)) throw new Error("Staging cannot access other media namespaces");
    return objectKey;
  }
  async upload(objectKey: string, stream: Readable): Promise<void> {
    // Multipart streaming bounds memory and aborts failed multipart uploads.
    await new Upload({ client: this.client, params: { Bucket: this.bucket, Key: this.key(objectKey), Body: stream },
      queueSize: 2, partSize: 5 * 1024 * 1024, leavePartsOnError: false }).done();
  }
  download(objectKey: string): Readable {
    const Key = this.key(objectKey);
    const output = new PassThrough();
    void this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key })).then(async result => {
      if (!(result.Body instanceof Readable)) throw new Error("Private storage returned no readable body");
      await pipeline(result.Body, output);
    }).catch(() => output.destroy(new Error("Private object storage download failed")));
    return output;
  }
  async exists(objectKey: string): Promise<boolean> {
    try { await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(objectKey) })); return true; }
    catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404) return false;
      throw new Error("Private object storage existence check failed");
    }
  }
  async delete(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(objectKey) }));
  }
}

export function createVerificationMediaObjectStore(): VerificationMediaObjectStore {
  if (process.env.VERIFICATION_MEDIA_BACKEND !== "s3") throw new Error("Configure VERIFICATION_MEDIA_BACKEND=s3; Replit storage is not available in this candidate");
  return new S3VerificationMediaObjectStore();
}
