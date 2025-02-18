import { pgTable, text, serial, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isProvider: boolean("is_provider").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  name: text("name"),
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

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  providerId: integer("provider_id").notNull(),
  status: text("status").notNull().default('pending'),
  rating: integer("rating"),
  priceTier: text("price_tier").notNull(),
  timestamp: text("timestamp").notNull(),
  serviceLocation: text("service_location").notNull(),
  serviceLocationType: text("service_location_type").notNull(),
  serviceLatitude: doublePrecision("service_latitude"),
  serviceLongitude: doublePrecision("service_longitude")
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isProvider: true,
  isAdmin: true,
  name: true,
  latitude: true,
  longitude: true,
  description: true,
  profileImage: true,
  currentStatus: true
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfig);
export const insertBookingSchema = createInsertSchema(bookings);

// Extend the booking schema with validation for location type
export const bookingFormSchema = insertBookingSchema.extend({
  serviceLocationType: z.enum(['home', 'work', 'other'], {
    required_error: "Please select a location type",
  }),
  serviceLocation: z.string().min(1, "Address is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type PricingConfig = typeof pricingConfig.$inferSelect;
export type BookingFormData = z.infer<typeof bookingFormSchema>;