import type { Express } from "express";
import { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
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

  // GPS Tracking endpoints
  app.post("/api/tracking/enable/:bookingId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const bookingId = parseInt(req.params.bookingId);
      const booking = await storage.enableTrackingForBooking(bookingId);
      res.json(booking);
    } catch (error) {
      console.error("Enable tracking error:", error);
      res.status(500).json({ error: "Failed to enable tracking" });
    }
  });

  app.get("/api/tracking/:bookingId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const bookingId = parseInt(req.params.bookingId);
      const trackingInfo = await storage.getTrackingInfo(bookingId);
      res.json(trackingInfo);
    } catch (error) {
      console.error("Get tracking info error:", error);
      res.status(500).json({ error: "Failed to get tracking info" });
    }
  });

  app.get("/api/tracking/active", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const bookings = await storage.getActiveTrackingBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get active tracking bookings error:", error);
      res.status(500).json({ error: "Failed to get active bookings" });
    }
  });

  // Provider endpoints
  app.post("/api/provider/location", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { latitude, longitude } = req.body;
    await storage.updateProviderLocation(req.user.id, latitude, longitude);
    res.json({ success: true });
  });

  app.post("/api/provider/location/booking/:bookingId", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const bookingId = parseInt(req.params.bookingId);
      const { latitude, longitude } = req.body;
      
      const booking = await storage.updateProviderLocationForBooking(bookingId, latitude, longitude);
      
      // Broadcast location update via WebSocket
      const message = JSON.stringify({
        type: 'location_update',
        bookingId,
        latitude,
        longitude,
        eta: booking.estimatedArrival,
        distance: booking.distanceToCustomer
      });
      
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      
      res.json(booking);
    } catch (error) {
      console.error("Update provider location for booking error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.patch("/api/provider/status", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { status } = req.body;
    const user = await storage.updateProviderStatus(req.user.id, status);
    res.json(user);
  });

  app.patch("/api/provider/location", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { latitude, longitude } = req.body;
    await storage.updateProviderLocation(req.user.id, latitude, longitude);
    
    // Return the updated user object
    const updatedUser = await storage.getUser(req.user.id);
    res.json(updatedUser);
  });

  // User profile update endpoint
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const { name, email, phone, address, description } = req.body;
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        name,
        email,
        phone,
        address,
        description
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/bookings/active", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const bookings = await storage.getActiveBookings(req.user.id);
    res.json(bookings);
  });

  // Protected endpoints
  app.post("/api/bookings", async (req, res) => {
    if (!req.user) {
      console.log("Booking attempt without authentication");
      return res.status(401).json({ error: "Authentication required to create bookings. Please log in first." });
    }

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
      // Create a properly typed booking object with all required fields
      const booking = {
        userId: bookingWithoutId.userId,
        providerId: bookingWithoutId.providerId || null,
        serviceId: bookingWithoutId.serviceId,
        timeSlotId: bookingWithoutId.timeSlotId,
        serviceLocation: bookingWithoutId.serviceLocation,
        serviceLocationType: bookingWithoutId.serviceLocationType,
        priceTier: bookingWithoutId.priceTier,
        timestamp: bookingWithoutId.timestamp,
        
        // Optional or default fields
        status: 'pending',
        rating: null,
        serviceLatitude: bookingWithoutId.serviceLatitude || null,
        serviceLongitude: bookingWithoutId.serviceLongitude || null,
        vehicleId: bookingWithoutId.vehicleId || null,
        notes: null,
        date: req.body.date || null,
        time: req.body.time || null,
        currentStage: null,
        
        // New fields for earnings and metrics tracking
        ratingComment: null,
        amount: null,
        providerEarnings: null,
        startTime: null,
        endTime: null,
        serviceDuration: null,
        
        // Assignment system fields
        assignedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        assignmentExpiry: null,
        previousProviders: [],
        addOns: req.body.addOns || [],
        addOnTotal: req.body.addOnTotal || 0,
        totalPrice: req.body.totalPrice || null,
        
        // Payment fields
        isPaid: false,
        paymentStatus: 'pending',
        paymentId: null,
        paymentDate: null,
        paymentUrl: null,
        squareOrderId: null
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
      
      // Find nearby detailers for job assignment (within 15 miles)
      if (booking.serviceLatitude && booking.serviceLongitude) {
        try {
          const nearbyProviders = await storage.getNearbyProviders(
            booking.serviceLatitude, 
            booking.serviceLongitude, 
            15 // 15 mile radius
          );
          
          // Notify nearby providers via WebSocket
          const jobNotification = {
            type: 'new_job_available',
            booking: newBooking,
            providersNotified: nearbyProviders.length
          };
          
          // Send to all nearby providers
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(jobNotification));
            }
          });
          
          console.log(`Notified ${nearbyProviders.length} nearby providers about new booking ${newBooking.id}`);
        } catch (error) {
          console.error("Error finding nearby providers:", error);
        }
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
  
  app.get("/api/bookings/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send("Invalid booking ID");
    }
    
    const booking = await storage.getBookingById(id);
    
    if (!booking) {
      return res.status(404).send("Booking not found");
    }
    
    // Check if the booking belongs to the user or if user is a provider for this booking
    if (booking.userId !== req.user.id && 
        (!req.user.isProvider || booking.providerId !== req.user.id) && 
        !req.user.isAdmin) {
      return res.status(403).send("Access denied");
    }
    
    res.json(booking);
  });
  
  app.get("/api/provider/active-bookings", async (req, res) => {
    if (!req.user?.isProvider) return res.status(403).send('Provider access required');
    
    const bookings = await storage.getActiveBookings(req.user.id);
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
  
  // Rebooking analysis endpoint
  app.get("/api/rebooking/suggestions", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    try {
      const userBookings = await storage.getUserBookings(req.user.id);
      const services = await storage.getServices();
      const timeSlots = await storage.getAvailableTimeSlots();
      
      const suggestions = await storage.generateRebookingSuggestions(req.user.id, userBookings, services, timeSlots);
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating rebooking suggestions:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
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

  app.get("/api/admin/bookings", isAdmin, async (req, res) => {
    try {
      const bookings = await storage.getUnassignedBookings();
      const allBookings = [];
      
      // Get all bookings and enrich with user/provider names
      for (const booking of bookings) {
        const customer = await storage.getUser(booking.userId);
        const provider = booking.providerId ? await storage.getUser(booking.providerId) : null;
        const service = await storage.getServiceById(booking.serviceId);
        
        allBookings.push({
          ...booking,
          customerName: customer?.name || customer?.username || 'Unknown Customer',
          providerName: provider?.name || provider?.username || null,
          serviceName: service?.name || 'Unknown Service'
        });
      }
      
      res.json(allBookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/admin/earnings", isAdmin, async (req, res) => {
    try {
      // Calculate earnings from completed bookings
      const allBookings = await storage.getUnassignedBookings();
      const completedBookings = allBookings.filter(b => b.status === 'completed');
      
      const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
      const totalBookings = completedBookings.length;
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      
      // Mock monthly/weekly/daily breakdowns (in production, filter by date)
      const monthlyRevenue = totalRevenue * 0.3;
      const weeklyRevenue = totalRevenue * 0.1;
      const todayRevenue = totalRevenue * 0.02;
      
      res.json({
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        todayRevenue,
        averageBookingValue,
        totalBookings
      });
    } catch (error) {
      console.error("Error calculating earnings:", error);
      res.status(500).json({ error: "Failed to calculate earnings" });
    }
  });

  app.get("/api/admin/analytics", isAdmin, async (req, res) => {
    try {
      const allBookings = await storage.getUnassignedBookings();
      const allUsers = await storage.getAllUsers();
      const providers = allUsers.filter(u => u.isProvider);
      const customers = allUsers.filter(u => !u.isProvider && !u.isAdmin);
      
      const totalJobs = allBookings.length;
      const completedJobs = allBookings.filter(b => b.status === 'completed').length;
      const cancelledJobs = allBookings.filter(b => b.status === 'cancelled').length;
      
      // Calculate service popularity
      const serviceStats = new Map();
      for (const booking of allBookings) {
        const service = await storage.getServiceById(booking.serviceId);
        const serviceName = service?.name || 'Unknown';
        const current = serviceStats.get(serviceName) || { count: 0, revenue: 0 };
        serviceStats.set(serviceName, {
          count: current.count + 1,
          revenue: current.revenue + (booking.totalPrice || 0)
        });
      }
      
      const topServices = Array.from(serviceStats.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Calculate provider performance
      const providerStats = new Map();
      for (const booking of allBookings.filter(b => b.providerId)) {
        const provider = await storage.getUser(booking.providerId!);
        const providerName = provider?.name || provider?.username || 'Unknown';
        const current = providerStats.get(booking.providerId!) || { 
          name: providerName, 
          completedJobs: 0, 
          revenue: 0, 
          rating: provider?.rating || 5 
        };
        
        if (booking.status === 'completed') {
          providerStats.set(booking.providerId!, {
            ...current,
            completedJobs: current.completedJobs + 1,
            revenue: current.revenue + (booking.totalPrice || 0)
          });
        }
      }
      
      const topProviders = Array.from(providerStats.entries())
        .map(([id, stats]) => ({ id: Number(id), ...stats }))
        .sort((a, b) => b.completedJobs - a.completedJobs)
        .slice(0, 5);
      
      res.json({
        totalJobs,
        completedJobs,
        cancelledJobs,
        userGrowth: {
          totalUsers: allUsers.length,
          newUsersThisMonth: Math.floor(allUsers.length * 0.1), // Mock calculation
          totalProviders: providers.length,
          activeProviders: providers.filter(p => p.currentStatus === 'online').length
        },
        topServices,
        topProviders
      });
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  app.patch("/api/admin/users/:id/status", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { action } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const newStatus = action === 'activate' ? 'offline' : 'inactive';
      const updatedUser = await storage.updateProviderStatus(userId, newStatus);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.patch("/api/admin/bookings/:id/reassign", isAdmin, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { providerId } = req.body;
      
      if (isNaN(bookingId) || !providerId) {
        return res.status(400).json({ error: "Invalid booking ID or provider ID" });
      }
      
      const updatedBooking = await storage.assignBookingToProvider(bookingId, providerId);
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error reassigning booking:", error);
      res.status(500).json({ error: "Failed to reassign booking" });
    }
  });

  app.patch("/api/admin/bookings/:id/cancel", isAdmin, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
      }
      
      const updatedBooking = await storage.updateBookingStatus(bookingId, 'cancelled');
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  app.get("/api/admin/revenue-by-location", isAdmin, async (req, res) => {
    const revenueData = await storage.getRevenueByLocation();
    res.json(revenueData);
  });

  app.get("/api/admin/provider-status", isAdmin, async (req, res) => {
    const statusData = await storage.getProviderStatusSummary();
    res.json(statusData);
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

  // Get available jobs for providers (within 15 miles)
  app.get("/api/provider/available-jobs", async (req, res) => {
    if (!req.user || !req.user.isProvider) return res.sendStatus(401);

    try {
      // Get provider's location
      const provider = await storage.getUser(req.user.id);
      if (!provider || !provider.latitude || !provider.longitude) {
        return res.json([]);
      }

      // Get all unassigned bookings
      const unassignedBookings = await storage.getUnassignedBookings();
      
      // Filter bookings within 15 miles
      const nearbyJobs = [];
      for (const booking of unassignedBookings) {
        if (booking.serviceLatitude && booking.serviceLongitude) {
          const distance = calculateDistance(
            provider.latitude,
            provider.longitude,
            booking.serviceLatitude,
            booking.serviceLongitude
          );
          
          if (distance <= 15) {
            nearbyJobs.push({...booking, distance: Math.round(distance * 10) / 10});
          }
        }
      }

      res.json(nearbyJobs);
    } catch (error) {
      console.error("Error fetching available jobs:", error);
      res.status(500).json({ error: "Failed to fetch available jobs" });
    }
  });

  // Accept a job
  app.post("/api/provider/accept-job/:bookingId", async (req, res) => {
    if (!req.user || !req.user.isProvider) return res.sendStatus(401);

    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
      }

      // Check if booking is still available
      const booking = await storage.getBookingById(bookingId);
      if (!booking || booking.status !== 'unassigned') {
        return res.status(400).json({ error: "Job is no longer available" });
      }

      // Assign the job to this provider
      const updatedBooking = await storage.assignBookingToProvider(bookingId, req.user.id);
      
      // Notify via WebSocket that job was accepted
      const notification = {
        type: 'job_accepted',
        bookingId: bookingId,
        providerId: req.user.id,
        providerName: req.user.name || req.user.username
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notification));
        }
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error accepting job:", error);
      res.status(500).json({ error: "Failed to accept job" });
    }
  });

  // Reject a job
  app.post("/api/provider/reject-job/:bookingId", async (req, res) => {
    if (!req.user || !req.user.isProvider) return res.sendStatus(401);

    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
      }

      // Add this provider to the rejected list for this booking
      const updatedBooking = await storage.rejectBooking(bookingId, req.user.id);
      
      res.json({ success: true, message: "Job rejected" });
    } catch (error) {
      console.error("Error rejecting job:", error);
      res.status(500).json({ error: "Failed to reject job" });
    }
  });

  // Helper function to calculate distance between two coordinates
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Test Square connection endpoint
  app.get("/api/test-square", async (req, res) => {
    try {
      // Check if credentials exist
      const hasToken = !!process.env.SQUARE_ACCESS_TOKEN;
      const hasAppId = !!process.env.SQUARE_APPLICATION_ID;
      const hasLocationId = !!process.env.SQUARE_LOCATION_ID;
      
      if (!hasToken || !hasAppId || !hasLocationId) {
        return res.json({
          status: "missing_credentials",
          credentials: {
            access_token: hasToken,
            application_id: hasAppId,
            location_id: hasLocationId
          },
          message: "Square credentials are incomplete"
        });
      }
      
      const environment = process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox') ? 'sandbox' : 'production';
      
      res.json({
        status: "credentials_available",
        environment,
        message: "Square credentials are configured. Payment processing should work for bookings."
      });
    } catch (error: any) {
      console.error("Square connection test failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to test Square connection"
      });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active client connections for each user ID
  const clients = new Map<number, WebSocket[]>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    // We'll set this when the client sends an auth message
    let userId: number | null = null;
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle client authentication/registration
        if (data.type === 'auth' && typeof data.userId === 'number') {
          // Ensure userId is never null after this point
          const userIdValue = data.userId;
          userId = userIdValue;
          
          // Store client connection for this user
          if (!clients.has(userIdValue)) {
            clients.set(userIdValue, []);
          }
          
          const userConnections = clients.get(userIdValue);
          if (userConnections) {
            userConnections.push(ws);
          }
          
          console.log(`WebSocket client authenticated for user ${userId}`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'auth_confirmed',
            userId
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Remove client from connections
      if (userId) {
        const userClients = clients.get(userId) || [];
        const index = userClients.indexOf(ws);
        if (index !== -1) {
          userClients.splice(index, 1);
        }
        
        // Remove user entry if no more connections
        if (userClients.length === 0) {
          clients.delete(userId);
        }
      }
    });
  });
  
  // This section was moved to the end of the file
  
  // Provider earnings and metrics endpoints
  app.get('/api/provider/earnings', async (req, res) => {
    if (!req.user?.isProvider) {
      return res.status(403).send('Provider access required');
    }
    
    const period = req.query.period as string || 'month';
    try {
      const earnings = await storage.getProviderEarnings(req.user.id, period);
      res.json(earnings);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Failed to get earnings data');
    }
  });
  
  app.get('/api/provider/metrics', async (req, res) => {
    if (!req.user?.isProvider) {
      return res.status(403).send('Provider access required');
    }
    
    try {
      const metrics = await storage.getProviderServiceMetrics(req.user.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Failed to get service metrics');
    }
  });
  
  // Service timer endpoints
  app.post('/api/bookings/:id/start', async (req, res) => {
    if (!req.user?.isProvider) {
      return res.status(403).send('Provider access required');
    }
    
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const booking = await storage.startServiceTimer(id);
      
      // Notify the customer via WebSocket if they're connected
      if (booking.userId) {
        const userClients = clients.get(booking.userId) || [];
        
        if (userClients.length > 0) {
          const notification = JSON.stringify({
            type: 'booking_update',
            booking: {
              id: booking.id,
              status: booking.status,
              stage: booking.currentStage || null,
              startTime: booking.startTime
            }
          });
          
          userClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(notification);
            }
          });
        }
      }
      
      res.json(booking);
    } catch (error) {
      res.status(404).send(error instanceof Error ? error.message : 'Booking not found');
    }
  });
  
  app.post('/api/bookings/:id/complete', async (req, res) => {
    if (!req.user?.isProvider) {
      return res.status(403).send('Provider access required');
    }
    
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const booking = await storage.completeServiceTimer(id);
      
      // Notify the customer via WebSocket if they're connected
      if (booking.userId) {
        const userClients = clients.get(booking.userId) || [];
        
        if (userClients.length > 0) {
          const notification = JSON.stringify({
            type: 'booking_update',
            booking: {
              id: booking.id,
              status: booking.status,
              stage: booking.currentStage || null,
              endTime: booking.endTime,
              serviceDuration: booking.serviceDuration
            }
          });
          
          userClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(notification);
            }
          });
        }
      }
      
      res.json(booking);
    } catch (error) {
      res.status(404).send(error instanceof Error ? error.message : 'Booking not found or timer not started');
    }
  });
  
  // Payment endpoints
  app.post('/api/bookings/:id/create-payment', async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      // Get the booking and service details
      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).send('Booking not found');
      }
      
      // Verify this booking belongs to the user
      if (booking.userId !== req.user.id) {
        return res.status(403).send('Access denied');
      }
      
      // Check if booking is already paid
      if (booking.isPaid) {
        return res.status(400).send('Booking is already paid');
      }
      
      // Get service details
      const service = await storage.getServiceById(booking.serviceId);
      if (!service) {
        return res.status(404).send('Service not found');
      }
      
      try {
        const { createPaymentLink } = await import('./payment-service');
        const { url, orderId } = await createPaymentLink(booking, service);
        
        // Update booking with payment link
        await storage.updateBookingPaymentInfo(booking.id, {
          paymentUrl: url,
          squareOrderId: orderId,
          paymentStatus: 'pending'
        });
        
        res.json({ paymentUrl: url });
      } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to create payment link' 
        });
      }
    } catch (error) {
      console.error('Payment endpoint error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  });
  
  app.post('/api/bookings/:id/verify-payment', async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      // Get the booking
      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).send('Booking not found');
      }
      
      // Verify payment status using Square
      if (booking.paymentId) {
        const { verifyPaymentStatus } = await import('./payment-service');
        const isPaid = await verifyPaymentStatus(booking.paymentId);
        
        if (isPaid && !booking.isPaid) {
          // Update booking payment status
          await storage.updateBookingPaymentInfo(booking.id, {
            isPaid: true,
            paymentStatus: 'completed',
            paymentDate: new Date().toISOString()
          });
          
          // Also update booking status to confirmed
          await storage.updateBookingStatus(booking.id, 'confirmed');
          
          return res.json({ verified: true, status: 'completed' });
        }
      }
      
      res.json({ 
        verified: booking.isPaid, 
        status: booking.paymentStatus 
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to verify payment' 
      });
    }
  });
  
  // Payment webhook endpoint (this would be called by Square)
  app.post('/api/payment-webhook', async (req, res) => {
    try {
      const { type, data } = req.body;
      
      // Handle payment.updated event
      if (type === 'payment.updated') {
        const { payment } = data.object;
        
        if (payment.status === 'COMPLETED') {
          // Find booking with this payment ID
          const bookings = await storage.getPendingPaymentBookings();
          const booking = bookings.find(b => b.paymentId === payment.id);
          
          if (booking) {
            // Mark booking as paid
            await storage.updateBookingPaymentInfo(booking.id, {
              isPaid: true,
              paymentStatus: 'completed',
              paymentDate: new Date().toISOString()
            });
            
            // Update booking status to confirmed
            await storage.updateBookingStatus(booking.id, 'confirmed');
            
            // Notify user via WebSocket
            const userClients = clients.get(booking.userId) || [];
            if (userClients.length > 0) {
              const notification = JSON.stringify({
                type: 'payment_completed',
                bookingId: booking.id
              });
              
              userClients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(notification);
                }
              });
            }
          }
        }
      }
      
      res.status(200).end();
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).end();
    }
  });

  // Rating endpoint
  app.post('/api/bookings/:id/rating', async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    
    const id = parseInt(req.params.id);
    const { rating, comment } = req.body;
    
    if (isNaN(id) || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).send('Invalid booking ID or rating (must be 1-5)');
    }
    
    try {
      // Verify this booking belongs to the user
      const booking = await storage.getBookingById(id);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).send('Access denied');
      }
      
      const updatedBooking = await storage.addBookingRating(id, rating, comment);
      
      // Notify the provider via WebSocket if they're connected
      if (updatedBooking.providerId) {
        const providerClients = clients.get(updatedBooking.providerId) || [];
        
        if (providerClients.length > 0) {
          const notification = JSON.stringify({
            type: 'rating_received',
            booking: {
              id: updatedBooking.id,
              rating: updatedBooking.rating,
              ratingComment: updatedBooking.ratingComment
            }
          });
          
          providerClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(notification);
            }
          });
        }
      }
      
      res.json(updatedBooking);
    } catch (error) {
      res.status(404).send(error instanceof Error ? error.message : 'Booking not found');
    }
  });

  // Add API endpoint to update booking status with notifications
  app.post('/api/bookings/:id/status', async (req, res) => {
    if (!req.user?.isProvider) {
      return res.status(403).send('Provider access required');
    }
    
    const { status, stage } = req.body;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      // Update the booking status
      const booking = await storage.updateBookingStatus(id, status, stage);
      
      // Notify the customer via WebSocket if they're connected
      if (booking.userId) {
        const userClients = clients.get(booking.userId) || [];
        
        if (userClients.length > 0) {
          const notification = JSON.stringify({
            type: 'booking_update',
            booking: {
              id: booking.id,
              status: booking.status,
              stage: booking.currentStage || null,
            }
          });
          
          userClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(notification);
            }
          });
        }
      }
      
      res.json(booking);
    } catch (error) {
      res.status(404).send(error instanceof Error ? error.message : 'Booking not found');
    }
  });
  
  // Booking assignment system endpoints
  
  // Get bookings by timeframe for provider dashboard
  app.get('/api/provider/bookings/:timeframe', isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const timeframe = req.params.timeframe as 'day' | 'week' | 'month';
    if (!['day', 'week', 'month'].includes(timeframe)) {
      return res.status(400).send('Invalid timeframe. Must be day, week, or month');
    }
    
    try {
      const bookings = await storage.getBookingsByTimeframe(req.user.id, timeframe);
      res.json(bookings);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Failed to get bookings');
    }
  });
  
  // Check for assigned bookings
  app.get('/api/provider/assignments', isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const assignment = await storage.findBookingAssignment(req.user.id);
      
      if (assignment) {
        res.json(assignment);
      } else {
        res.json({ assigned: false });
      }
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Failed to get assignments');
    }
  });
  
  // Accept a booking assignment
  app.post('/api/provider/bookings/:id/accept', isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const booking = await storage.acceptBooking(id, req.user.id);
      
      // Notify the customer about the accepted booking
      if (booking.userId) {
        const userClients = clients.get(booking.userId) || [];
        
        if (userClients.length > 0) {
          const notification = JSON.stringify({
            type: 'booking_accepted',
            booking: {
              id: booking.id,
              status: booking.status,
              providerId: booking.providerId,
              acceptedAt: booking.acceptedAt
            }
          });
          
          userClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(notification);
            }
          });
        }
      }
      
      res.json(booking);
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : 'Failed to accept booking');
    }
  });
  
  // Reject a booking assignment
  app.post('/api/provider/bookings/:id/reject', isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const booking = await storage.rejectBooking(id, req.user.id);
      
      // Find a new provider for this booking
      if (booking.serviceLatitude && booking.serviceLongitude) {
        // Get nearby providers (within 20km) who haven't rejected the booking
        const providers = await storage.getNearbyProviders(
          booking.serviceLatitude, 
          booking.serviceLongitude, 
          20
        );
        
        // Filter out providers who have already rejected this booking
        const previousProviders = Array.isArray(booking.previousProviders) 
          ? booking.previousProviders as number[]
          : [];
        
        const eligibleProviders = providers.filter(p => 
          !previousProviders.includes(p.id)
        );
        
        // Assign to the first eligible provider if available
        if (eligibleProviders.length > 0) {
          const newProvider = eligibleProviders[0];
          await storage.assignBookingToProvider(booking.id, newProvider.id);
          
          // Notify the new provider
          const providerClients = clients.get(newProvider.id) || [];
          if (providerClients.length > 0) {
            const notification = JSON.stringify({
              type: 'new_assignment',
              bookingId: booking.id
            });
            
            providerClients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(notification);
              }
            });
          }
        }
      }
      
      res.json(booking);
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : 'Failed to reject booking');
    }
  });
  
  // Admin-only: manually assign booking to provider
  app.post('/api/admin/bookings/:id/assign/:providerId', isAdmin, async (req, res) => {
    const bookingId = parseInt(req.params.id);
    const providerId = parseInt(req.params.providerId);
    
    if (isNaN(bookingId) || isNaN(providerId)) {
      return res.status(400).send('Invalid booking ID or provider ID');
    }
    
    try {
      const booking = await storage.assignBookingToProvider(bookingId, providerId);
      
      // Notify the provider
      const providerClients = clients.get(providerId) || [];
      if (providerClients.length > 0) {
        const notification = JSON.stringify({
          type: 'new_assignment',
          bookingId: booking.id
        });
        
        providerClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(notification);
          }
        });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(400).send(error instanceof Error ? error.message : 'Failed to assign booking');
    }
  });
  
  // List unassigned bookings (admin only)
  app.get('/api/admin/bookings/unassigned', isAdmin, async (req, res) => {
    try {
      const bookings = await storage.getUnassignedBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Failed to get unassigned bookings');
    }
  });
  
  return httpServer;
}