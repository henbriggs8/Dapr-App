ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "referral_credit_balance_cents" integer NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "referral_discount_cents" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "referral_credit_applied_cents" integer NOT NULL DEFAULT 0;

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "referral_code_used" text,
  ADD COLUMN IF NOT EXISTS "reward_status" text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "discount_status" text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS "related_booking_id" integer,
  ADD COLUMN IF NOT EXISTS "discount_amount_cents" integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS "reward_amount_cents" integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS "completed_at" text,
  ADD COLUMN IF NOT EXISTS "rewarded_at" text;

UPDATE "users"
SET "referral_code" = upper(substr(md5("id"::text || clock_timestamp()::text), 1, 8))
WHERE "is_provider" = false AND "referral_code" IS NULL;

UPDATE "referrals" AS r
SET "referral_code_used" = COALESCE(u."referred_by_code", referrer."referral_code", 'LEGACY')
FROM "users" AS u, "users" AS referrer
WHERE r."referred_user_id" = u."id"
  AND r."referrer_id" = referrer."id"
  AND r."referral_code_used" IS NULL;

UPDATE "referrals"
SET "referral_code_used" = 'LEGACY'
WHERE "referral_code_used" IS NULL;

UPDATE "referrals"
SET "reward_status" = CASE WHEN "referrer_credited" THEN 'legacy_credited' ELSE 'pending' END,
    "discount_status" = 'legacy_redeemed'
WHERE "related_booking_id" IS NULL;

ALTER TABLE "referrals"
  ALTER COLUMN "referral_code_used" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "referrals_related_booking_id_unique"
  ON "referrals" ("related_booking_id")
  WHERE "related_booking_id" IS NOT NULL;

ALTER TABLE "users"
  ADD CONSTRAINT "users_referral_credit_nonnegative"
  CHECK ("referral_credit_balance_cents" >= 0) NOT VALID;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_referral_discount_nonnegative"
  CHECK ("referral_discount_cents" >= 0) NOT VALID;
