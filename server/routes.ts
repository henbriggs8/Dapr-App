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

  // Provider endpoints
  app.post("/api/provider/location", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { latitude, longitude } = req.body;
    await storage.updateProviderLocation(req.user.id, latitude, longitude);
    res.json({ success: true });
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
    res.json({ success: true });
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