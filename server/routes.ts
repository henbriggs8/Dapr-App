import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/providers", async (req, res) => {
    const providers = await storage.getProviders();
    res.json(providers);
  });

  app.post("/api/bookings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const booking = insertBookingSchema.parse({
      ...req.body,
      userId: req.user.id,
    });
    
    const newBooking = await storage.createBooking(booking);
    res.status(201).json(newBooking);
  });

  app.get("/api/bookings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const bookings = await storage.getUserBookings(req.user.id);
    res.json(bookings);
  });

  const httpServer = createServer(app);
  return httpServer;
}
