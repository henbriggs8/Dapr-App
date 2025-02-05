import { pgTable, text, serial, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isProvider: boolean("is_provider").notNull().default(false),
  name: text("name"),
  rating: doublePrecision("rating").default(5),
  ratingCount: integer("rating_count").default(0),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  description: text("description"),
  profileImage: text("profile_image"),
  priceBasic: integer("price_basic"),
  priceStandard: integer("price_standard"),
  pricePremium: integer("price_premium")
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
  name: true,
  latitude: true,
  longitude: true,
  description: true,
  profileImage: true,
  priceBasic: true,
  priceStandard: true,
  pricePremium: true
});

export const insertBookingSchema = createInsertSchema(bookings);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
