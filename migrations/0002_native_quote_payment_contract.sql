CREATE TABLE IF NOT EXISTS "booking_quotes" (
  "id" text PRIMARY KEY,
  "user_id" integer NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_fingerprint" text NOT NULL,
  "service_id" integer NOT NULL,
  "time_slot_id" integer NOT NULL,
  "vehicle_id" integer NOT NULL,
  "service_location" text NOT NULL,
  "service_location_type" text NOT NULL,
  "service_latitude" double precision,
  "service_longitude" double precision,
  "date" text NOT NULL,
  "time" text NOT NULL,
  "price_tier" text NOT NULL,
  "add_on_ids" json NOT NULL DEFAULT '[]'::json,
  "add_ons" json NOT NULL DEFAULT '[]'::json,
  "subtotal_cents" integer NOT NULL,
  "referral_discount_cents" integer NOT NULL DEFAULT 0,
  "referral_credit_applied_cents" integer NOT NULL DEFAULT 0,
  "total_amount_cents" integer NOT NULL,
  "expires_at" text NOT NULL,
  "created_at" text NOT NULL,
  "consumed_at" text,
  "booking_id" integer
);

CREATE UNIQUE INDEX IF NOT EXISTS "booking_quotes_user_idempotency_unique"
  ON "booking_quotes" ("user_id", "idempotency_key");

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "quote_id" text,
  ADD COLUMN IF NOT EXISTS "booking_idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "payment_intent_idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "payment_expires_at" text,
  ADD COLUMN IF NOT EXISTS "referral_credit_refunded_at" text;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_quote_id_unique"
  ON "bookings" ("quote_id") WHERE "quote_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_idempotency_key_unique"
  ON "bookings" ("booking_idempotency_key") WHERE "booking_idempotency_key" IS NOT NULL;
