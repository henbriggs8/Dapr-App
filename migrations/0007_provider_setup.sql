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
  CONSTRAINT "provider_application_setup_application_fk"
    FOREIGN KEY ("application_id") REFERENCES "provider_applications"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_application_setup_user_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_application_setup_training_admin_fk"
    FOREIGN KEY ("training_completed_by") REFERENCES "users"("id"),
  CONSTRAINT "provider_application_setup_radius_check"
    CHECK ("max_travel_radius" IS NULL OR "max_travel_radius" BETWEEN 5 AND 50),
  CONSTRAINT "provider_application_setup_guide_ack_check"
    CHECK (
      ("service_guide_version" IS NULL AND "service_guide_acknowledged_at" IS NULL)
      OR
      ("service_guide_version" IS NOT NULL AND "service_guide_acknowledged_at" IS NOT NULL)
    ),
  CONSTRAINT "provider_application_setup_service_area_check"
    CHECK (
      "service_area_confirmed_at" IS NULL
      OR (
        "service_area_region" IS NOT NULL
        AND btrim("service_area_region") <> ''
        AND "service_area_zip_codes" IS NOT NULL
        AND cardinality("service_area_zip_codes") > 0
        AND array_to_string("service_area_zip_codes", ',') ~ '^[0-9]{5}(,[0-9]{5})*$'
        AND "max_travel_radius" BETWEEN 5 AND 50
      )
    ),
  CONSTRAINT "provider_application_setup_training_check"
    CHECK (
      ("training_completed_at" IS NULL AND "training_completed_by" IS NULL)
      OR
      ("training_completed_at" IS NOT NULL AND "training_completed_by" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "provider_application_setup_application_unique"
  ON "provider_application_setup" ("application_id");

CREATE UNIQUE INDEX "provider_application_setup_user_unique"
  ON "provider_application_setup" ("user_id");
