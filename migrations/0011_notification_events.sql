CREATE TABLE IF NOT EXISTS "notification_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "booking_id" integer REFERENCES "bookings"("id") ON DELETE CASCADE,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "provider_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "recipient" text NOT NULL,
  "channel" text NOT NULL DEFAULT 'email',
  "provider" text NOT NULL DEFAULT 'resend',
  "notification_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempt_count" integer NOT NULL DEFAULT 0,
  "idempotency_key" text NOT NULL,
  "provider_message_id" text,
  "error_message" text,
  "metadata" json NOT NULL DEFAULT '{}'::json,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "first_attempted_at" timestamptz,
  "last_attempted_at" timestamptz,
  "next_attempt_at" timestamptz,
  "claim_token" text,
  "sent_at" timestamptz,
  "failed_at" timestamptz,
  CONSTRAINT "notification_events_status_check"
    CHECK ("status" IN ('pending', 'processing', 'sent', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_idempotency_unique"
  ON "notification_events" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "notification_events_booking_created_idx"
  ON "notification_events" ("booking_id", "created_at");
CREATE INDEX IF NOT EXISTS "notification_events_delivery_queue_idx"
  ON "notification_events" ("status", "last_attempted_at");