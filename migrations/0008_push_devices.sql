CREATE TABLE "push_devices" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fcm_token" text NOT NULL,
  "app_type" text NOT NULL,
  "platform" text NOT NULL,
  "environment" text NOT NULL,
  "notifications_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "push_devices_app_type_check" CHECK ("app_type" IN ('customer', 'provider')),
  CONSTRAINT "push_devices_platform_check" CHECK ("platform" = 'ios'),
  CONSTRAINT "push_devices_environment_check" CHECK ("environment" IN ('development', 'production'))
);

CREATE UNIQUE INDEX "push_devices_fcm_token_unique" ON "push_devices" ("fcm_token");
CREATE INDEX "push_devices_enabled_user_idx" ON "push_devices" ("user_id", "notifications_enabled");
CREATE INDEX "push_devices_user_app_idx" ON "push_devices" ("user_id", "app_type");
CREATE INDEX "push_devices_last_seen_idx" ON "push_devices" ("last_seen_at");

-- Preserve the legacy column during the native-client transition. A later cleanup
-- migration may remove users.push_token only after clients have re-registered.
-- Legacy registrations have no reliable environment metadata, so they are
-- treated as production iOS registrations. The existing is_provider field
-- determines the app type.
INSERT INTO "push_devices" ("user_id", "fcm_token", "app_type", "platform", "environment", "notifications_enabled")
SELECT
  "id",
  btrim("push_token"),
  CASE WHEN "is_provider" THEN 'provider' ELSE 'customer' END,
  'ios',
  'production',
  true
FROM "users"
WHERE "push_token" IS NOT NULL
  AND btrim("push_token") <> ''
ON CONFLICT ("fcm_token") DO NOTHING;