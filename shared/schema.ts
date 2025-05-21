import { pgTable, text, serial, integer, boolean, doublePrecision, json } from "drizzle-orm/pg-core";
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
  description: text("description"),
  profileImage: text("profile_image"),
  currentStatus: text("current_status").default('offline'),
  lastLocationUpdate: text("last_location_update")
});

export const pricingConfig = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  basic: integer("basic").notNull(),
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

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  providerId: integer("provider_id"), // Can be null for unassigned bookings
  serviceId: integer("service_id").notNull(),
  timeSlotId: integer("time_slot_id").notNull(),
  vehicleId: integer("vehicle_id"),
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
  
  // Payment fields
  isPaid: boolean("is_paid").default(false), // Whether booking has been paid for
  paymentStatus: text("payment_status").default('pending'), // 'pending', 'processing', 'completed', 'failed'
  paymentId: text("payment_id"), // Square payment ID
  paymentDate: text("payment_date"), // When payment was completed
  paymentUrl: text("payment_url"), // URL for Square checkout
  squareOrderId: text("square_order_id") // Square order ID
});

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
export const insertVehicleSchema = createInsertSchema(vehicles);

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
export type Vehicle = typeof vehicles.$inferSelect;
export type PricingConfig = typeof pricingConfig.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type BookingFormData = z.infer<typeof bookingFormSchema>;