CREATE TABLE "booking_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"photo_type" text NOT NULL,
	"data_url" text NOT NULL,
	"caption" text,
	"uploaded_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"service_id" integer NOT NULL,
	"time_slot_id" integer,
	"vehicle_id" integer NOT NULL,
	"service_location" text NOT NULL,
	"service_location_type" text NOT NULL,
	"service_latitude" double precision,
	"service_longitude" double precision,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"price_tier" text NOT NULL,
	"add_on_ids" json DEFAULT '[]'::json NOT NULL,
	"add_ons" json DEFAULT '[]'::json NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"referral_discount_cents" integer DEFAULT 0 NOT NULL,
	"referral_credit_applied_cents" integer DEFAULT 0 NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"consumed_at" text,
	"booking_id" integer,
	"fulfillment_mode" text DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer,
	"service_id" integer NOT NULL,
	"time_slot_id" integer,
	"vehicle_id" integer,
	"booking_ref" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_stage" text,
	"rating" integer,
	"rating_comment" text,
	"price_tier" text NOT NULL,
	"timestamp" text NOT NULL,
	"service_location" text NOT NULL,
	"service_location_type" text NOT NULL,
	"service_latitude" double precision,
	"service_longitude" double precision,
	"notes" text,
	"date" text,
	"time" text,
	"amount" integer,
	"provider_earnings" integer,
	"start_time" text,
	"end_time" text,
	"service_duration" integer,
	"assigned_at" text,
	"accepted_at" text,
	"rejected_at" text,
	"assignment_expiry" text,
	"previous_providers" json DEFAULT '[]'::json,
	"add_ons" json DEFAULT '[]'::json,
	"add_on_total" integer,
	"total_price" integer,
	"referral_discount_cents" integer DEFAULT 0 NOT NULL,
	"referral_credit_applied_cents" integer DEFAULT 0 NOT NULL,
	"quote_id" text,
	"booking_idempotency_key" text,
	"payment_intent_idempotency_key" text,
	"payment_expires_at" text,
	"referral_credit_refunded_at" text,
	"fulfillment_mode" text DEFAULT 'scheduled' NOT NULL,
	"slot_reserved_at" text,
	"slot_reservation_released_at" text,
	"is_paid" boolean DEFAULT false,
	"payment_status" text DEFAULT 'pending',
	"payment_id" text,
	"payment_date" text,
	"payment_url" text,
	"stripe_session_id" text,
	"payment_method" text,
	"tip_amount" integer,
	"pending_tip_session_id" text,
	"pending_tip_cents" integer,
	"provider_latitude" double precision,
	"provider_longitude" double precision,
	"estimated_arrival" text,
	"last_location_update" text,
	"distance_to_customer" double precision,
	"tracking_enabled" boolean DEFAULT false,
	"arrival_time" text,
	"extra_time_minutes" integer DEFAULT 0,
	"estimated_completion_time" text,
	"time_adjustments" json DEFAULT '[]'::json,
	"provider_notes" text,
	CONSTRAINT "bookings_booking_ref_unique" UNIQUE("booking_ref"),
	CONSTRAINT "bookings_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "bookings_booking_idempotency_key_unique" UNIQUE("booking_idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "career_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"linkedin_url" text,
	"portfolio_url" text,
	"resume_object_key" text NOT NULL,
	"resume_file_name" text NOT NULL,
	"why_dapr" text NOT NULL,
	"relevant_experience" text NOT NULL,
	"role_specific_answer" text NOT NULL,
	"available_start" text NOT NULL,
	"authorized_to_work_us" boolean NOT NULL,
	"requires_sponsorship" boolean NOT NULL,
	"referral_source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clerk_stripe_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"email" text,
	"phone" text,
	"name" text,
	"created_at" text NOT NULL,
	CONSTRAINT "clerk_stripe_mapping_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"request_callback" boolean DEFAULT false NOT NULL,
	"submitted_at" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" text
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"booking_id" integer,
	"user_id" integer,
	"provider_id" integer,
	"recipient" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"notification_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_message_id" text,
	"error_message" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_attempted_at" timestamp with time zone,
	"last_attempted_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"claim_token" text,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pricing_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"basic" integer NOT NULL,
	"interior" integer NOT NULL,
	"standard" integer NOT NULL,
	"premium" integer NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_application_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"expected_checksum_sha256" text,
	"checksum_sha256" text,
	"upload_status" text DEFAULT 'pending' NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"version" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"supersedes_media_id" integer,
	"review_status" text DEFAULT 'pending' NOT NULL,
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
	CONSTRAINT "provider_application_media_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "provider_application_media_type_check" CHECK ("provider_application_media"."media_type" IN ('trunk_photo', 'back_seat_photo', 'walkaround_video')),
	CONSTRAINT "provider_application_media_mime_check" CHECK ("provider_application_media"."mime_type" IN ('image/jpeg', 'image/png', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime')),
	CONSTRAINT "provider_application_media_size_check" CHECK ("provider_application_media"."file_size_bytes" > 0 AND "provider_application_media"."file_size_bytes" <= 104857600),
	CONSTRAINT "provider_application_media_checksum_check" CHECK ("provider_application_media"."checksum_sha256" IS NULL OR "provider_application_media"."checksum_sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "provider_application_media_expected_checksum_check" CHECK ("provider_application_media"."expected_checksum_sha256" IS NULL OR "provider_application_media"."expected_checksum_sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "provider_application_media_upload_status_check" CHECK ("provider_application_media"."upload_status" IN ('pending', 'uploading', 'uploaded', 'failed', 'abandoned')),
	CONSTRAINT "provider_application_media_processing_status_check" CHECK ("provider_application_media"."processing_status" IN ('pending', 'processing', 'ready', 'failed')),
	CONSTRAINT "provider_application_media_review_status_check" CHECK ("provider_application_media"."review_status" IN ('pending', 'approved', 'rejected', 'replacement_requested')),
	CONSTRAINT "provider_application_media_version_check" CHECK ("provider_application_media"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "provider_application_setup" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"service_guide_version" text,
	"service_guide_acknowledged_at" text,
	"service_area_region" text,
	"service_area_zip_codes" text[],
	"max_travel_radius" integer,
	"service_area_confirmed_at" text,
	"training_completed_at" text,
	"training_completed_by" integer,
	"training_notes" text,
	"activated_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "provider_application_setup_radius_check" CHECK ("provider_application_setup"."max_travel_radius" IS NULL OR "provider_application_setup"."max_travel_radius" BETWEEN 5 AND 50),
	CONSTRAINT "provider_application_setup_guide_ack_check" CHECK (("provider_application_setup"."service_guide_version" IS NULL AND "provider_application_setup"."service_guide_acknowledged_at" IS NULL)
      OR ("provider_application_setup"."service_guide_version" IS NOT NULL AND "provider_application_setup"."service_guide_acknowledged_at" IS NOT NULL)),
	CONSTRAINT "provider_application_setup_service_area_check" CHECK ("provider_application_setup"."service_area_confirmed_at" IS NULL OR (
      "provider_application_setup"."service_area_region" IS NOT NULL
      AND btrim("provider_application_setup"."service_area_region") <> ''
      AND "provider_application_setup"."service_area_zip_codes" IS NOT NULL
      AND cardinality("provider_application_setup"."service_area_zip_codes") > 0
      AND array_to_string("provider_application_setup"."service_area_zip_codes", ',') ~ '^[0-9]{5}(,[0-9]{5})*$'
      AND "provider_application_setup"."max_travel_radius" BETWEEN 5 AND 50
    )),
	CONSTRAINT "provider_application_setup_training_check" CHECK (("provider_application_setup"."training_completed_at" IS NULL AND "provider_application_setup"."training_completed_by" IS NULL)
      OR ("provider_application_setup"."training_completed_at" IS NOT NULL AND "provider_application_setup"."training_completed_by" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "provider_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"full_name" text,
	"phone_number" text,
	"normalized_phone_number" text,
	"email" text,
	"normalized_email" text,
	"city" text,
	"zip_code" text,
	"experience_level" text,
	"years_detailing" integer,
	"vehicle_type" text,
	"vehicle_description" text,
	"available_weekdays" boolean DEFAULT false,
	"available_weekends" boolean DEFAULT false,
	"max_travel_radius" integer DEFAULT 15,
	"notes" text,
	"privacy_policy_version" text,
	"privacy_accepted_at" text,
	"applicant_terms_version" text,
	"applicant_terms_accepted_at" text,
	"contact_consent_at" text,
	"has_reliable_vehicle" boolean,
	"agreed_to_standards" boolean,
	"standards_version" text,
	"standards_accepted_at" text,
	"application_status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" text,
	"reviewed_at" text,
	"reviewed_by" integer,
	"internal_review_notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"fcm_token" text NOT NULL,
	"app_type" text NOT NULL,
	"platform" text NOT NULL,
	"environment" text NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"referral_code_used" text NOT NULL,
	"reward_status" text DEFAULT 'pending' NOT NULL,
	"discount_status" text DEFAULT 'available' NOT NULL,
	"related_booking_id" integer,
	"discount_amount_cents" integer DEFAULT 2000 NOT NULL,
	"reward_amount_cents" integer DEFAULT 2000 NOT NULL,
	"referrer_credited" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"completed_at" text,
	"rewarded_at" text,
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id"),
	CONSTRAINT "referrals_related_booking_id_unique" UNIQUE("related_booking_id")
);
--> statement-breakpoint
CREATE TABLE "saved_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text DEFAULT 'home' NOT NULL,
	"address" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"duration" integer NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"max_bookings" integer DEFAULT 3 NOT NULL,
	"current_bookings" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_provider" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"address" text,
	"rating" double precision DEFAULT 5,
	"rating_count" integer DEFAULT 0,
	"latitude" double precision,
	"longitude" double precision,
	"birthday" text,
	"description" text,
	"profile_image" text,
	"current_status" text DEFAULT 'offline',
	"last_location_update" text,
	"last_online_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"referral_code" text,
	"free_wash_credits" integer DEFAULT 0,
	"referred_by_code" text,
	"referral_credit_balance_cents" integer DEFAULT 0 NOT NULL,
	"stripe_customer_id" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"color" text,
	"license_plate" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_media" ADD CONSTRAINT "provider_application_media_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_media" ADD CONSTRAINT "provider_application_media_supersedes_media_id_provider_application_media_id_fk" FOREIGN KEY ("supersedes_media_id") REFERENCES "public"."provider_application_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_media" ADD CONSTRAINT "provider_application_media_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_setup" ADD CONSTRAINT "provider_application_setup_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_setup" ADD CONSTRAINT "provider_application_setup_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_setup" ADD CONSTRAINT "provider_application_setup_training_completed_by_users_id_fk" FOREIGN KEY ("training_completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_quotes_user_idempotency_unique" ON "booking_quotes" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_events_idempotency_unique" ON "notification_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_events_booking_created_idx" ON "notification_events" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_events_delivery_queue_idx" ON "notification_events" USING btree ("status","last_attempted_at");--> statement-breakpoint
CREATE INDEX "provider_application_media_application_idx" ON "provider_application_media" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "provider_application_media_cleanup_idx" ON "provider_application_media" USING btree ("upload_status","upload_expires_at") WHERE "provider_application_media"."object_deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_application_media_version_unique" ON "provider_application_media" USING btree ("application_id","media_type","version");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_application_media_current_unique" ON "provider_application_media" USING btree ("application_id","media_type") WHERE "provider_application_media"."is_current" = true AND "provider_application_media"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_application_setup_application_unique" ON "provider_application_setup" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_application_setup_user_unique" ON "provider_application_setup" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_devices_fcm_token_unique" ON "push_devices" USING btree ("fcm_token");--> statement-breakpoint
CREATE INDEX "push_devices_enabled_user_idx" ON "push_devices" USING btree ("user_id","notifications_enabled");--> statement-breakpoint
CREATE INDEX "push_devices_user_app_idx" ON "push_devices" USING btree ("user_id","app_type");--> statement-breakpoint
CREATE INDEX "push_devices_last_seen_idx" ON "push_devices" USING btree ("last_seen_at");