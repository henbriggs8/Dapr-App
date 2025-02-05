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
  profileImage: text("profile_image")
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
  timestamp: text("timestamp").notNull()
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
  profileImage: true
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfig);
export const insertBookingSchema = createInsertSchema(bookings);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type PricingConfig = typeof pricingConfig.$inferSelect;