CREATE TABLE "provider_application_media" (
  "id" serial PRIMARY KEY NOT NULL,
  "application_id" integer NOT NULL,
  "media_type" text NOT NULL,
  "object_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "expected_checksum_sha256" text,
  "checksum_sha256" text,
  "upload_status" text NOT NULL DEFAULT 'pending',
  "processing_status" text NOT NULL DEFAULT 'pending',
  "failure_reason" text,
  "version" integer NOT NULL,
  "is_current" boolean NOT NULL DEFAULT false,
  "supersedes_media_id" integer,
  "review_status" text NOT NULL DEFAULT 'pending',
  "rejection_reason" text,
  "upload_expires_at" text NOT NULL,
  "uploaded_at" text,
  "ready_at" text,
  "reviewed_at" text,
  "reviewed_by" integer,
  "superseded_at" text,
  "deleted_at" text,
  "object_deleted_at" text,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  CONSTRAINT "provider_application_media_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "provider_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_application_media_supersedes_fk"
    FOREIGN KEY ("supersedes_media_id") REFERENCES "provider_application_media"("id") ON DELETE SET NULL,
  CONSTRAINT "provider_application_media_reviewed_by_fk"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "provider_application_media_type_check"
    CHECK ("media_type" IN ('trunk_photo', 'back_seat_photo', 'walkaround_video')),
  CONSTRAINT "provider_application_media_mime_check"
    CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime')),
  CONSTRAINT "provider_application_media_size_check"
    CHECK ("file_size_bytes" > 0 AND "file_size_bytes" <= 104857600),
  CONSTRAINT "provider_application_media_checksum_check"
    CHECK ("checksum_sha256" IS NULL OR "checksum_sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "provider_application_media_expected_checksum_check"
    CHECK ("expected_checksum_sha256" IS NULL OR "expected_checksum_sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "provider_application_media_upload_status_check"
    CHECK ("upload_status" IN ('pending', 'uploading', 'uploaded', 'failed', 'abandoned')),
  CONSTRAINT "provider_application_media_processing_status_check"
    CHECK ("processing_status" IN ('pending', 'processing', 'ready', 'failed')),
  CONSTRAINT "provider_application_media_review_status_check"
    CHECK ("review_status" IN ('pending', 'approved', 'rejected', 'replacement_requested')),
  CONSTRAINT "provider_application_media_version_check"
    CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "provider_application_media_object_key_unique"
  ON "provider_application_media" ("object_key");

CREATE UNIQUE INDEX "provider_application_media_version_unique"
  ON "provider_application_media" ("application_id", "media_type", "version");

CREATE UNIQUE INDEX "provider_application_media_current_unique"
  ON "provider_application_media" ("application_id", "media_type")
  WHERE "is_current" = true AND "deleted_at" IS NULL;

CREATE INDEX "provider_application_media_application_idx"
  ON "provider_application_media" ("application_id");

CREATE INDEX "provider_application_media_cleanup_idx"
  ON "provider_application_media" ("upload_status", "upload_expires_at")
  WHERE "object_deleted_at" IS NULL;
