import { pgTable, text, serial, integer, boolean, doublePrecision, json, timestamp, uniqueIndex, index, check, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isProvider: boolean("is_provider").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  rating: doublePrecision("rating").default(5),
  ratingCount: integer("rating_count").default(0),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  birthday: text("birthday"),
  description: text("description"),
  profileImage: text("profile_image"),
  currentStatus: text("current_status").default('offline'),
  lastLocationUpdate: text("last_location_update"),
  referralCode: text("referral_code").unique(),
  freeWashCredits: integer("free_wash_credits").default(0),
  referredByCode: text("referred_by_code"),
  referralCreditBalanceCents: integer("referral_credit_balance_cents").notNull().default(0),
  stripeCustomerId: text("stripe_customer_id")
});

export const pushDevices = pgTable("push_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fcmToken: text("fcm_token").notNull(),
  appType: text("app_type").notNull(),
  platform: text("platform").notNull(),
  environment: text("environment").notNull(),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("push_devices_fcm_token_unique").on(table.fcmToken),
  index("push_devices_enabled_user_idx").on(table.userId, table.notificationsEnabled),
  index("push_devices_user_app_idx").on(table.userId, table.appType),
  index("push_devices_last_seen_idx").on(table.lastSeenAt),
]);

export const pricingConfig = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  basic: integer("basic").notNull(),
  interior: integer("interior").notNull(),
  standard: integer("standard").notNull(),
  premium: integer("premium").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  duration: integer("duration").notNull(), // duration in minutes
  category: text("category").notNull(), // 'basic', 'standard', 'premium'
});

export const timeSlots = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format 
  endTime: text("end_time").notNull(), // HH:MM format
  isAvailable: boolean("is_available").notNull().default(true),
  maxBookings: integer("max_bookings").notNull().default(3),
  currentBookings: integer("current_bookings").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false)
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  color: text("color"),
  licensePlate: text("license_plate"),
  notes: text("notes")
});

export const savedAddresses = pgTable("saved_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  label: text("label").notNull().default("home"),
  address: text("address").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  providerId: integer("provider_id"), // Can be null for unassigned bookings
  serviceId: integer("service_id").notNull(),
  timeSlotId: integer("time_slot_id"),
  vehicleId: integer("vehicle_id"),
  // Human-readable booking reference e.g. DAPR-A3X9K2
  bookingRef: text("booking_ref").unique(),
  // Status can be: 'pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled'
  status: text("status").notNull().default('pending'),
  currentStage: text("current_stage"), // For tracking service progress stages
  rating: integer("rating"),
  ratingComment: text("rating_comment"), // Added for customer feedback
  priceTier: text("price_tier").notNull(),
  timestamp: text("timestamp").notNull(),
  serviceLocation: text("service_location").notNull(),
  serviceLocationType: text("service_location_type").notNull(),
  serviceLatitude: doublePrecision("service_latitude"),
  serviceLongitude: doublePrecision("service_longitude"),
  notes: text("notes"),
  date: text("date"), 
  time: text("time"),
  // Fields for tracking earnings and service metrics
  amount: integer("amount"), // Price charged in cents
  providerEarnings: integer("provider_earnings"), // Provider's cut in cents
  startTime: text("start_time"), // When service actually started (ISO string)
  endTime: text("end_time"), // When service was completed (ISO string)
  serviceDuration: integer("service_duration"), // Actual duration in minutes
  
  // Assignment system fields
  assignedAt: text("assigned_at"), // When booking was assigned to provider
  acceptedAt: text("accepted_at"), // When provider accepted the booking
  rejectedAt: text("rejected_at"), // When provider rejected the booking
  assignmentExpiry: text("assignment_expiry"), // Expiry time for provider to respond
  previousProviders: json("previous_providers").default([]), // Array of providers who rejected
  addOns: json("add_ons").default([]), // JSON array of selected add-ons
  addOnTotal: integer("add_on_total"), // Total price of add-ons
  totalPrice: integer("total_price"), // Total booking price incl. add-ons
  referralDiscountCents: integer("referral_discount_cents").notNull().default(0),
  referralCreditAppliedCents: integer("referral_credit_applied_cents").notNull().default(0),
  quoteId: text("quote_id").unique(),
  bookingIdempotencyKey: text("booking_idempotency_key").unique(),
  paymentIntentIdempotencyKey: text("payment_intent_idempotency_key"),
  paymentExpiresAt: text("payment_expires_at"),
  referralCreditRefundedAt: text("referral_credit_refunded_at"),
  fulfillmentMode: text("fulfillment_mode").notNull().default("scheduled"),
  slotReservedAt: text("slot_reserved_at"),
  slotReservationReleasedAt: text("slot_reservation_released_at"),
  
  // Payment fields
  isPaid: boolean("is_paid").default(false), // Whether booking has been paid for
  paymentStatus: text("payment_status").default('pending'), // 'pending', 'processing', 'completed', 'failed'
  paymentId: text("payment_id"), // Payment provider payment/session ID
  paymentDate: text("payment_date"), // When payment was completed
  paymentUrl: text("payment_url"), // URL for Stripe checkout
  stripeSessionId: text("stripe_session_id"), // Stripe Checkout Session ID
  paymentMethod: text("payment_method"), // Payment method used e.g. 'paypal', 'card', 'apple_pay', 'google_pay'
  tipAmount: integer("tip_amount"), // Tip amount in cents (set after Stripe confirms payment)
  pendingTipSessionId: text("pending_tip_session_id"), // Stripe Checkout Session ID for pending tip
  pendingTipCents: integer("pending_tip_cents"), // Expected tip cents for pending checkout
  
  // GPS Tracking fields
  providerLatitude: doublePrecision("provider_latitude"), // Current provider location
  providerLongitude: doublePrecision("provider_longitude"), // Current provider location
  estimatedArrival: text("estimated_arrival"), // ETA in ISO string format
  lastLocationUpdate: text("last_location_update"), // Last GPS update timestamp
  distanceToCustomer: doublePrecision("distance_to_customer"), // Distance in miles
  trackingEnabled: boolean("tracking_enabled").default(false), // Whether customer can track provider

  // Time adjustment fields
  arrivalTime: text("arrival_time"), // When provider marked arrived (ISO string)
  extraTimeMinutes: integer("extra_time_minutes").default(0), // Total extra minutes from adjustments
  estimatedCompletionTime: text("estimated_completion_time"), // Calculated ETA for service completion
  timeAdjustments: json("time_adjustments").default([]), // Array of TimeAdjustment objects
  providerNotes: text("provider_notes") // Optional provider notes about the job
});

export const bookingQuotes = pgTable("booking_quotes", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  serviceId: integer("service_id").notNull(),
  timeSlotId: integer("time_slot_id"),
  vehicleId: integer("vehicle_id").notNull(),
  serviceLocation: text("service_location").notNull(),
  serviceLocationType: text("service_location_type").notNull(),
  serviceLatitude: doublePrecision("service_latitude"),
  serviceLongitude: doublePrecision("service_longitude"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  priceTier: text("price_tier").notNull(),
  addOnIds: json("add_on_ids").notNull().default([]),
  addOns: json("add_ons").notNull().default([]),
  subtotalCents: integer("subtotal_cents").notNull(),
  referralDiscountCents: integer("referral_discount_cents").notNull().default(0),
  referralCreditAppliedCents: integer("referral_credit_applied_cents").notNull().default(0),
  totalAmountCents: integer("total_amount_cents").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  consumedAt: text("consumed_at"),
  bookingId: integer("booking_id"),
  fulfillmentMode: text("fulfillment_mode").notNull().default("scheduled"),
}, (table) => ({
  userIdempotencyUnique: uniqueIndex("booking_quotes_user_idempotency_unique")
    .on(table.userId, table.idempotencyKey),
}));

export const bookingPhotos = pgTable("booking_photos", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  photoType: text("photo_type").notNull(), // 'before' | 'after'
  dataUrl: text("data_url").notNull(), // base64-encoded data URL
  caption: text("caption"),
  uploadedAt: text("uploaded_at").notNull(),
});

export const clerkStripeMapping = pgTable("clerk_stripe_mapping", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  email: text("email"),
  phone: text("phone"),
  name: text("name"),
  createdAt: text("created_at").notNull()
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id").notNull().unique(),
  referralCodeUsed: text("referral_code_used").notNull(),
  rewardStatus: text("reward_status").notNull().default("pending"),
  discountStatus: text("discount_status").notNull().default("available"),
  relatedBookingId: integer("related_booking_id").unique(),
  discountAmountCents: integer("discount_amount_cents").notNull().default(2000),
  rewardAmountCents: integer("reward_amount_cents").notNull().default(2000),
  referrerCredited: boolean("referrer_credited").notNull().default(false),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
  rewardedAt: text("rewarded_at")
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  requestCallback: boolean("request_callback").notNull().default(false),
  submittedAt: text("submitted_at").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: text("resolved_at"),
});

// ── Provider Applications ────────────────────────────────────────────────────
export const providerApplications = pgTable("provider_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // nullable — linked once authenticated

  // Step 1 — Personal info
  fullName: text("full_name"),
  phoneNumber: text("phone_number"),
  normalizedPhoneNumber: text("normalized_phone_number"),
  email: text("email"),
  normalizedEmail: text("normalized_email"),
  city: text("city"),
  zipCode: text("zip_code"),

  // Step 2 — Experience & vehicle
  experienceLevel: text("experience_level"), // newToDetailing | someExperience | experienced | professional
  yearsDetailing: integer("years_detailing"),
  vehicleType: text("vehicle_type"), // Car | SUV | Truck | Van
  vehicleDescription: text("vehicle_description"),

  // Step 3 — Availability
  availableWeekdays: boolean("available_weekdays").default(false),
  availableWeekends: boolean("available_weekends").default(false),
  maxTravelRadius: integer("max_travel_radius").default(15),
  notes: text("notes"),

  // Review step — legal agreements
  privacyPolicyVersion: text("privacy_policy_version"),
  privacyAcceptedAt: text("privacy_accepted_at"),
  applicantTermsVersion: text("applicant_terms_version"),
  applicantTermsAcceptedAt: text("applicant_terms_accepted_at"),
  contactConsentAt: text("contact_consent_at"),

  // Phase 2 — verification (nullable until needed)
  hasReliableVehicle: boolean("has_reliable_vehicle"),
  agreedToStandards: boolean("agreed_to_standards"),
  standardsVersion: text("standards_version"),
  standardsAcceptedAt: text("standards_accepted_at"),

  // Application lifecycle
  applicationStatus: text("application_status").notNull().default("draft"),
  submittedAt: text("submitted_at"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: integer("reviewed_by"), // userId of admin who performed the last review action
  internalReviewNotes: text("internal_review_notes"), // never exposed to applicants

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const providerApplicationMedia = pgTable("provider_application_media", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull()
    .references(() => providerApplications.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  objectKey: text("object_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  expectedChecksumSha256: text("expected_checksum_sha256"),
  checksumSha256: text("checksum_sha256"),
  uploadStatus: text("upload_status").notNull().default("pending"),
  processingStatus: text("processing_status").notNull().default("pending"),
  failureReason: text("failure_reason"),
  version: integer("version").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  supersedesMediaId: integer("supersedes_media_id")
    .references((): AnyPgColumn => providerApplicationMedia.id, { onDelete: "set null" }),
  reviewStatus: text("review_status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  uploadExpiresAt: text("upload_expires_at").notNull(),
  uploadedAt: text("uploaded_at"),
  readyAt: text("ready_at"),
  reviewedAt: text("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  supersededAt: text("superseded_at"),
  deletedAt: text("deleted_at"),
  objectDeletedAt: text("object_deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  applicationLookup: index("provider_application_media_application_idx")
    .on(table.applicationId),
  cleanupLookup: index("provider_application_media_cleanup_idx")
    .on(table.uploadStatus, table.uploadExpiresAt)
    .where(sql`${table.objectDeletedAt} IS NULL`),
  versionUnique: uniqueIndex("provider_application_media_version_unique")
    .on(table.applicationId, table.mediaType, table.version),
  currentUnique: uniqueIndex("provider_application_media_current_unique")
    .on(table.applicationId, table.mediaType)
    .where(sql`${table.isCurrent} = true AND ${table.deletedAt} IS NULL`),
  mediaTypeCheck: check("provider_application_media_type_check",
    sql`${table.mediaType} IN ('trunk_photo', 'back_seat_photo', 'walkaround_video')`),
  mimeCheck: check("provider_application_media_mime_check",
    sql`${table.mimeType} IN ('image/jpeg', 'image/png', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime')`),
  sizeCheck: check("provider_application_media_size_check",
    sql`${table.fileSizeBytes} > 0 AND ${table.fileSizeBytes} <= 104857600`),
  checksumCheck: check("provider_application_media_checksum_check",
    sql`${table.checksumSha256} IS NULL OR ${table.checksumSha256} ~ '^[a-f0-9]{64}$'`),
  expectedChecksumCheck: check("provider_application_media_expected_checksum_check",
    sql`${table.expectedChecksumSha256} IS NULL OR ${table.expectedChecksumSha256} ~ '^[a-f0-9]{64}$'`),
  uploadStatusCheck: check("provider_application_media_upload_status_check",
    sql`${table.uploadStatus} IN ('pending', 'uploading', 'uploaded', 'failed', 'abandoned')`),
  processingStatusCheck: check("provider_application_media_processing_status_check",
    sql`${table.processingStatus} IN ('pending', 'processing', 'ready', 'failed')`),
  reviewStatusCheck: check("provider_application_media_review_status_check",
    sql`${table.reviewStatus} IN ('pending', 'approved', 'rejected', 'replacement_requested')`),
  versionCheck: check("provider_application_media_version_check", sql`${table.version} > 0`),
}));

export const providerApplicationSetup = pgTable("provider_application_setup", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull()
    .references(() => providerApplications.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serviceGuideVersion: text("service_guide_version"),
  serviceGuideAcknowledgedAt: text("service_guide_acknowledged_at"),
  serviceAreaRegion: text("service_area_region"),
  serviceAreaZipCodes: text("service_area_zip_codes").array(),
  maxTravelRadius: integer("max_travel_radius"),
  serviceAreaConfirmedAt: text("service_area_confirmed_at"),
  trainingCompletedAt: text("training_completed_at"),
  trainingCompletedBy: integer("training_completed_by")
    .references(() => users.id),
  trainingNotes: text("training_notes"),
  activatedAt: text("activated_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  applicationUnique: uniqueIndex("provider_application_setup_application_unique")
    .on(table.applicationId),
  userUnique: uniqueIndex("provider_application_setup_user_unique")
    .on(table.userId),
  radiusCheck: check("provider_application_setup_radius_check",
    sql`${table.maxTravelRadius} IS NULL OR ${table.maxTravelRadius} BETWEEN 5 AND 50`),
  guideAcknowledgementCheck: check("provider_application_setup_guide_ack_check",
    sql`(${table.serviceGuideVersion} IS NULL AND ${table.serviceGuideAcknowledgedAt} IS NULL)
      OR (${table.serviceGuideVersion} IS NOT NULL AND ${table.serviceGuideAcknowledgedAt} IS NOT NULL)`),
  serviceAreaCheck: check("provider_application_setup_service_area_check",
    sql`${table.serviceAreaConfirmedAt} IS NULL OR (
      ${table.serviceAreaRegion} IS NOT NULL
      AND btrim(${table.serviceAreaRegion}) <> ''
      AND ${table.serviceAreaZipCodes} IS NOT NULL
      AND cardinality(${table.serviceAreaZipCodes}) > 0
      AND array_to_string(${table.serviceAreaZipCodes}, ',') ~ '^[0-9]{5}(,[0-9]{5})*$'
      AND ${table.maxTravelRadius} BETWEEN 5 AND 50
    )`),
  trainingCompletionCheck: check("provider_application_setup_training_check",
    sql`(${table.trainingCompletedAt} IS NULL AND ${table.trainingCompletedBy} IS NULL)
      OR (${table.trainingCompletedAt} IS NOT NULL AND ${table.trainingCompletedBy} IS NOT NULL)`),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  providedBookings: many(bookings, { relationName: "provider" }),
  vehicles: many(vehicles)
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id]
  }),
  provider: one(users, {
    fields: [bookings.providerId],
    references: [users.id],
    relationName: "provider"
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id]
  }),
  timeSlot: one(timeSlots, {
    fields: [bookings.timeSlotId],
    references: [timeSlots.id]
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicleId],
    references: [vehicles.id]
  })
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id]
  }),
  bookings: many(bookings)
}));

export const servicesRelations = relations(services, ({ many }) => ({
  bookings: many(bookings)
}));

export const timeSlotsRelations = relations(timeSlots, ({ many }) => ({
  bookings: many(bookings)
}));

export const bookingPhotosRelations = relations(bookingPhotos, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingPhotos.bookingId],
    references: [bookings.id]
  })
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isProvider: true,
  isAdmin: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  latitude: true,
  longitude: true,
  description: true,
  profileImage: true,
  currentStatus: true
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfig);
export const insertServiceSchema = createInsertSchema(services);
export const insertTimeSlotSchema = createInsertSchema(timeSlots);
export const insertBookingSchema = createInsertSchema(bookings);
export const insertBookingPhotoSchema = createInsertSchema(bookingPhotos).omit({ id: true });
export const insertVehicleSchema = createInsertSchema(vehicles);
export const insertClerkStripeMappingSchema = createInsertSchema(clerkStripeMapping).omit({
  id: true
});

// Extend the booking schema with validation for location type
export const bookingFormSchema = insertBookingSchema.extend({
  serviceLocationType: z.enum(['home', 'work', 'other'], {
    required_error: "Please select a location type",
  }),
  serviceLocation: z.string().min(1, "Address is required"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 digits").optional(),
  serviceId: z.number({
    required_error: "Service ID is required",
  }),
  timeSlotId: z.number({
    required_error: "Time slot ID is required",
  }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type TimeSlot = typeof timeSlots.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingQuote = typeof bookingQuotes.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type PricingConfig = typeof pricingConfig.$inferSelect;
export const insertSavedAddressSchema = createInsertSchema(savedAddresses).omit({ id: true });
export type InsertSavedAddress = z.infer<typeof insertSavedAddressSchema>;
export type SavedAddress = typeof savedAddresses.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type BookingFormData = z.infer<typeof bookingFormSchema>;
export type ClerkStripeMapping = typeof clerkStripeMapping.$inferSelect;
export type InsertClerkStripeMapping = z.infer<typeof insertClerkStripeMappingSchema>;
export type BookingPhoto = typeof bookingPhotos.$inferSelect;
export type InsertBookingPhoto = z.infer<typeof insertBookingPhotoSchema>;
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true });
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, resolved: true, resolvedAt: true }).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Provider application types
export type ProviderApplication = typeof providerApplications.$inferSelect;
export type InsertProviderApplication = typeof providerApplications.$inferInsert;
export type ProviderApplicationMedia = typeof providerApplicationMedia.$inferSelect;
export type InsertProviderApplicationMedia = typeof providerApplicationMedia.$inferInsert;
export type ProviderApplicationSetup = typeof providerApplicationSetup.$inferSelect;
export type InsertProviderApplicationSetup = typeof providerApplicationSetup.$inferInsert;

export const PROVIDER_APPLICATION_MEDIA_TYPES = [
  "trunk_photo",
  "back_seat_photo",
  "walkaround_video",
] as const;
export type ProviderApplicationMediaType = typeof PROVIDER_APPLICATION_MEDIA_TYPES[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "verification_requested",
  "verification_submitted",
  "approved_needs_setup",
  "rejected",
  "active_provider",
  "withdrawn",
] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

/** Application transitions an admin is allowed to trigger. Provider verification submission is provider-owned. */
export const ADMIN_ALLOWED_TRANSITIONS: Record<string, ApplicationStatus[]> = {
  submitted:              ["under_review"],
  under_review:           ["verification_requested", "rejected"],
  verification_submitted: ["approved_needs_setup", "rejected"],
  // active_provider is set by controlled backend logic (setup completion), not direct admin action
};

export function requiresGuardedVehicleVerificationApproval(status: string): boolean {
  return status === "approved_needs_setup";
}

/** Human-readable labels for each status — safe to display to applicants */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft:                  "Draft",
  submitted:              "Application received",
  under_review:           "We're reviewing your application",
  verification_requested: "Verification needed",
  verification_submitted: "Verification submitted",
  approved_needs_setup:   "You're approved — finish setting up your Dapr Pro account",
  rejected:               "Application not approved",
  active_provider:        "You're ready to earn with Dapr",
  withdrawn:              "Application withdrawn",
};
