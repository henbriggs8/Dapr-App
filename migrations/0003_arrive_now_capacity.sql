ALTER TABLE "booking_quotes"
  ADD COLUMN IF NOT EXISTS "fulfillment_mode" text NOT NULL DEFAULT 'scheduled';

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "fulfillment_mode" text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS "slot_reserved_at" text,
  ADD COLUMN IF NOT EXISTS "slot_reservation_released_at" text;

ALTER TABLE "time_slots"
  ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT false;

ALTER TABLE "booking_quotes"
  DROP CONSTRAINT IF EXISTS "booking_quotes_fulfillment_mode_check";

ALTER TABLE "booking_quotes"
  ADD CONSTRAINT "booking_quotes_fulfillment_mode_check"
  CHECK ("fulfillment_mode" IN ('asap', 'scheduled'));

ALTER TABLE "bookings"
  DROP CONSTRAINT IF EXISTS "bookings_fulfillment_mode_check";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_fulfillment_mode_check"
  CHECK ("fulfillment_mode" IN ('asap', 'scheduled'));
