import { pgTable, text, serial, integer, boolean, doublePrecision, json, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  stripeCustomerId: text("stripe_customer_id"),
  pushToken: text("push_token")
});

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
  currentBookings: integer("current_bookings").notNull().default(0)
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
  timeSlotId: integer("time_slot_id").notNull(),
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
  paymentMethod: text("payment_method"), // Payment method used: 'card', 'apple_pay', 'google_pay', 'paypal'
  
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
  timeSlotId: integer("time_slot_id").notNull(),
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
