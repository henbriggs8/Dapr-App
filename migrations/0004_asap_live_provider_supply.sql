ALTER TABLE "booking_quotes"
  ALTER COLUMN "time_slot_id" DROP NOT NULL;

ALTER TABLE "bookings"
  ALTER COLUMN "time_slot_id" DROP NOT NULL;

ALTER TABLE "booking_quotes"
  DROP CONSTRAINT IF EXISTS "booking_quotes_scheduled_slot_required";

ALTER TABLE "booking_quotes"
  ADD CONSTRAINT "booking_quotes_scheduled_slot_required"
  CHECK ("fulfillment_mode" <> 'scheduled' OR "time_slot_id" IS NOT NULL);

ALTER TABLE "bookings"
  DROP CONSTRAINT IF EXISTS "bookings_scheduled_slot_required";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_scheduled_slot_required"
  CHECK ("fulfillment_mode" <> 'scheduled' OR "time_slot_id" IS NOT NULL);
