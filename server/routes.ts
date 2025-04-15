import type { Express } from "express";
import { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookingSchema, insertPricingConfigSchema, insertServiceSchema, insertTimeSlotSchema, insertVehicleSchema } from "@shared/schema";

function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).send("Admin access required");
  }
  next();
}

function isProvider(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isProvider) {
    return res.status(403).send("Provider access required");
  }
  next();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Public endpoints
  app.get("/api/providers", async (req, res) => {
    const providers = await storage.getProviders();
    res.json(providers);
  });

  app.get("/api/pricing", async (req, res) => {
    const pricing = await storage.getPricingConfig();
    res.json(pricing);
  });

  // Provider endpoints
  app.post("/api/provider/location", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { latitude, longitude } = req.body;
    await storage.updateProviderLocation(req.user.id, latitude, longitude);
    res.json({ success: true });
  });

  app.post("/api/provider/status", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { status } = req.body;
    const user = await storage.updateProviderStatus(req.user.id, status);
    res.json(user);
  });

  app.get("/api/bookings/active", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const bookings = await storage.getActiveBookings(req.user.id);
    res.json(bookings);
  });

  // Protected endpoints
  app.post("/api/bookings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user.id,
        status: 'pending', // Explicitly set status for new bookings
        serviceLatitude: req.body.serviceLatitude || null,
        serviceLongitude: req.body.serviceLongitude || null
      });
  
      // Remove id from booking data since it's auto-generated
      const { id, ...bookingWithoutId } = bookingData;
      const booking = {
        ...bookingWithoutId,
        status: 'pending', // Explicitly set status for new bookings
        rating: null, // Ensure rating is null for new bookings
        serviceLatitude: bookingWithoutId.serviceLatitude || null,
        serviceLongitude: bookingWithoutId.serviceLongitude || null,
        vehicleId: bookingWithoutId.vehicleId || null
      };

      const newBooking = await storage.createBooking(booking);
      
      // Update time slot bookings count
      try {
        const timeSlot = await storage.getTimeSlotById(booking.timeSlotId);
        if (timeSlot) {
          await storage.updateTimeSlot(timeSlot.id, {
            currentBookings: timeSlot.currentBookings + 1
          });
        }
      } catch (error) {
        console.error("Error updating time slot booking count:", error instanceof Error ? error.message : String(error));
      }
      
      res.status(201).json(newBooking);
    } catch (error) {
      console.error("Error creating booking:", error instanceof Error ? error.message : String(error));
      res.status(400).json({ error: error instanceof Error ? error.message : "An error occurred" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const bookings = await storage.getUserBookings(req.user.id);
    res.json(bookings);
  });

  // Vehicle endpoints
  app.get("/api/vehicles", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const vehicles = await storage.getUserVehicles(req.user.id);
    res.json(vehicles);
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid vehicle ID");
    }
    
    const vehicle = await storage.getVehicleById(id);
    if (!vehicle) {
      return res.status(404).send("Vehicle not found");
    }
    
    // Check if the vehicle belongs to the current user
    if (vehicle.userId !== req.user.id) {
      return res.status(403).send("Access denied");
    }
    
    res.json(vehicle);
  });

  app.post("/api/vehicles", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const vehicleData = insertVehicleSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      // Remove id from vehicle data since it's auto-generated
      const { id, ...vehicleWithoutId } = vehicleData;
      
      const newVehicle = await storage.createVehicle(vehicleWithoutId);
      res.status(201).json(newVehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error instanceof Error ? error.message : String(error));
      res.status(400).json({ error: error instanceof Error ? error.message : "An error occurred" });
    }
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid vehicle ID");
    }
    
    // Check if the vehicle exists and belongs to the user
    const vehicle = await storage.getVehicleById(id);
    if (!vehicle) {
      return res.status(404).send("Vehicle not found");
    }
    
    if (vehicle.userId !== req.user.id) {
      return res.status(403).send("Access denied");
    }
    
    try {
      const updatedVehicle = await storage.updateVehicle(id, req.body);
      res.json(updatedVehicle);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An error occurred" });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid vehicle ID");
    }
    
    // Check if the vehicle exists and belongs to the user
    const vehicle = await storage.getVehicleById(id);
    if (!vehicle) {
      return res.status(404).send("Vehicle not found");
    }
    
    if (vehicle.userId !== req.user.id) {
      return res.status(403).send("Access denied");
    }
    
    const result = await storage.deleteVehicle(id);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete vehicle" });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.get("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid service ID");
    }
    
    const service = await storage.getServiceById(id);
    if (!service) {
      return res.status(404).send("Service not found");
    }
    
    res.json(service);
  });
  
  // Time slots endpoints
  app.get("/api/timeslots", async (req, res) => {
    const date = req.query.date as string | undefined;
    const timeSlots = await storage.getAvailableTimeSlots(date);
    res.json(timeSlots);
  });
  
  app.get("/api/timeslots/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid time slot ID");
    }
    
    const timeSlot = await storage.getTimeSlotById(id);
    if (!timeSlot) {
      return res.status(404).send("Time slot not found");
    }
    
    res.json(timeSlot);
  });

  // Admin endpoints
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/admin/pricing", isAdmin, async (req, res) => {
    const pricing = insertPricingConfigSchema.parse({
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    const updated = await storage.updatePricingConfig(pricing);
    res.json(updated);
  });
  
  // Admin service management
  app.post("/api/admin/services", isAdmin, async (req, res) => {
    const serviceData = insertServiceSchema.parse(req.body);
    const { id, ...serviceWithoutId } = serviceData;
    
    const newService = await storage.createService(serviceWithoutId);
    res.status(201).json(newService);
  });
  
  // Admin time slot management
  app.post("/api/admin/timeslots", isAdmin, async (req, res) => {
    const timeSlotData = insertTimeSlotSchema.parse(req.body);
    const { id, ...timeSlotWithoutId } = timeSlotData;
    
    const newTimeSlot = await storage.createTimeSlot(timeSlotWithoutId);
    res.status(201).json(newTimeSlot);
  });
  
  app.patch("/api/admin/timeslots/:id", isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid time slot ID");
    }
    
    try {
      const updatedTimeSlot = await storage.updateTimeSlot(id, req.body);
      res.json(updatedTimeSlot);
    } catch (error) {
      res.status(404).send(error instanceof Error ? error.message : "Time slot not found");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}