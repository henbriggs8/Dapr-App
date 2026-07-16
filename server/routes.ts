import express from "express";
import type { Express } from "express";
import { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { safeUser, setupAuth } from "./auth";
import { ReferralError, storage } from "./storage";
import { sendNewBookingEmail } from "./email-service";
import { insertBookingSchema, insertPricingConfigSchema, insertServiceSchema, insertTimeSlotSchema, insertVehicleSchema, insertContactMessageSchema } from "@shared/schema";
import { ADD_ONS, ADD_ONS_BY_ID, resolveBookingAddOns } from "@shared/add-ons";
import { clerkAuthMiddleware, ClerkRequest, resolveUserFromBearer } from "./clerk-middleware";
import { clerkClient } from "@clerk/clerk-sdk-node";
import fs from "fs";
import path from "path";
import { canAccessBookingTracking, canMutateAssignedBooking, isAllowedProviderStage, isAllowedProviderStatusTransition, unknownAddOnIds } from "./booking-route-safety";
import { attachNativePaymentIntent, confirmZeroAmountBooking, createBookingFromQuote, createNativeQuote, markNativeBookingPaid, NativeContractError, nativePaymentStatus, refundReferralCreditsForFailedPayment, serializeQuote } from "./native-payment-contract";
import { getAsapAvailability } from "./asap-availability";

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

function providerAuthError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: message, code, message });
}

function referralAuthError(res: Response) {
  return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Authentication is required.' });
}

function requireIdempotencyKey(req: Request): string {
  const value = req.get("Idempotency-Key")?.trim();
  if (!value || !/^[A-Za-z0-9._:-]{16,128}$/.test(value)) {
    throw new NativeContractError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 16-128 safe characters.");
  }
  return value;
}

function nativeContractError(res: Response, error: unknown) {
  if (error instanceof NativeContractError) return res.status(error.status).json({ code: error.code, error: error.message });
  if (error && typeof error === "object" && "issues" in error) return res.status(400).json({ code: "INVALID_REQUEST", error: "Request validation failed.", details: (error as any).issues });
  console.error("Native payment contract error:", error);
  return res.status(500).json({ code: "INTERNAL_ERROR", error: "The request could not be completed." });
}

function serializeReferral(referral: any) {
  return {
    id: referral.id,
    referrerUserId: referral.referrerId,
    referredUserId: referral.referredUserId,
    referralCodeUsed: referral.referralCodeUsed,
    rewardStatus: referral.rewardStatus,
    discountStatus: referral.discountStatus,
    relatedBookingId: referral.relatedBookingId,
    createdAt: referral.createdAt,
    completedAt: referral.completedAt,
    rewardedAt: referral.rewardedAt,
  };
}

function requireProvider(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return providerAuthError(res, 401, "UNAUTHENTICATED", "Please sign in again.");
  }

  if (!req.user.isProvider) {
    return providerAuthError(res, 403, "PROVIDER_REQUIRED", "This account is not approved as a Dapr Pro yet.");
  }

  next();
}

function safeProviderProfile(user: Express.User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
    rating: user.rating,
    ratingCount: user.ratingCount,
    currentStatus: user.currentStatus,
    isProvider: user.isProvider,
  };
}

/** Returns true only for real Stripe customer IDs (cus_...). */
function isValidStripeCustomerId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.startsWith('cus_');
}

/**
 * Returns the Stripe customer ID for any authenticated user.
 * Works for both Clerk users (via clerkStripeMapping table) and non-Clerk users.
 * Creates a Stripe customer if one doesn't exist yet and persists it on the user record for fast future lookups.
 */
async function resolveOrCreateStripeCustomerId(user: Express.User): Promise<string | undefined> {
  // Fast path: a valid Stripe customer ID is already on the user record
  if (isValidStripeCustomerId(user.stripeCustomerId)) return user.stripeCustomerId;

  try {
    const { createStripeCustomer } = await import('./payment-service');

    if (user.username.startsWith('clerk_')) {
      const clerkUserId = user.username.substring(6);
      let mapping = await storage.getClerkStripeMapping(clerkUserId);

      // If no mapping or the stored ID is not a valid Stripe customer ID, create a fresh one
      if (!mapping || !isValidStripeCustomerId(mapping.stripeCustomerId)) {
        const newId = await createStripeCustomer(
          user.email || undefined,
          user.phone || undefined,
          user.name || undefined
        );
        await storage.upsertClerkStripeMapping(clerkUserId, newId);
        mapping = { ...(mapping ?? { id: 0, email: null, phone: null, name: null, createdAt: new Date().toISOString() }), clerkUserId, stripeCustomerId: newId };
      }
      // Persist on user record for future fast-path lookups
      await storage.updateUserStripeCustomerId(user.id, mapping.stripeCustomerId);
      return mapping.stripeCustomerId;
    }

    // Non-Clerk user: create a Stripe customer and store it on the user record
    const newId = await createStripeCustomer(
      user.email || undefined,
      user.phone || undefined,
      user.name || undefined
    );
    await storage.updateUserStripeCustomerId(user.id, newId);
    return newId;
  } catch (err) {
    console.error('resolveOrCreateStripeCustomerId error:', err);
    return undefined;
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const clients = new Map<number, WebSocket[]>();

  const sendBookingEvent = (booking: { userId: number; providerId?: number | null }, payload: unknown) => {
    const participantIds = new Set([booking.userId, booking.providerId].filter((id): id is number => typeof id === "number"));
    const message = JSON.stringify(payload);
    participantIds.forEach(userId => {
      (clients.get(userId) || []).forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
      });
    });
  };

  const loadProviderMutableBooking = async (req: Request, res: Response, bookingId: number) => {
    if (!req.user || (!req.user.isProvider && !req.user.isAdmin)) {
      res.status(403).json({ code: "PROVIDER_REQUIRED", error: "Provider or admin access required" });
      return null;
    }
    const booking = await storage.getBookingById(bookingId);
    if (!booking) {
      res.status(404).json({ code: "BOOKING_NOT_FOUND", error: "Booking not found" });
      return null;
    }
    if (!canMutateAssignedBooking(req.user, booking)) {
      res.status(403).json({ code: "BOOKING_ASSIGNMENT_REQUIRED", error: "Only the assigned provider or an admin can update this booking" });
      return null;
    }
    return booking;
  };


  // Public endpoints
  app.get("/api/providers", async (req, res) => {
    const providers = await storage.getProviders();
    res.json(providers);
  });

  app.get("/api/pricing", async (req, res) => {
    const pricing = await storage.getPricingConfig();
    res.json(pricing);
  });

  // Weather-based service recommendations
  app.get("/api/weather/recommendations", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const { weatherService } = await import('./weather-service');
      const recommendations = await weatherService.getServiceRecommendations(latitude, longitude);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Weather recommendations error:", error);
      res.status(500).json({ error: "Failed to get weather recommendations" });
    }
  });

  app.get("/api/weather/current", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const { weatherService } = await import('./weather-service');
      const weather = await weatherService.getCurrentWeather(latitude, longitude);
      
      if (!weather) {
        return res.status(503).json({ error: "Weather service unavailable" });
      }
      
      res.json(weather);
    } catch (error) {
      console.error("Weather data error:", error);
      res.status(500).json({ error: "Failed to get weather data" });
    }
  });

  // GPS Tracking endpoints
  app.post("/api/tracking/enable/:bookingId", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });
      const existing = await storage.getBookingById(bookingId);
      if (!existing) return res.status(404).json({ error: "Booking not found" });
      if (!canAccessBookingTracking(req.user, existing)) return res.status(403).json({ error: "Access denied" });
      const booking = await storage.enableTrackingForBooking(bookingId);
      res.json(booking);
    } catch (error) {
      console.error("Enable tracking error:", error);
      res.status(500).json({ error: "Failed to enable tracking" });
    }
  });

  app.get("/api/tracking/active", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const bookings = await storage.getActiveTrackingBookings(req.user.id);
      res.json(bookings);
    } catch (error) {
      console.error("Get active tracking bookings error:", error);
      res.status(500).json({ error: "Failed to get active bookings" });
    }
  });

  app.get("/api/tracking/:bookingId", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });
      const booking = await storage.getBookingById(bookingId);
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      if (!canAccessBookingTracking(req.user, booking)) return res.status(403).json({ error: "Access denied" });
      const trackingInfo = await storage.getTrackingInfo(bookingId);
      res.json(trackingInfo);
    } catch (error) {
      console.error("Get tracking info error:", error);
      res.status(500).json({ error: "Failed to get tracking info" });
    }
  });

  // Provider endpoints
  app.get("/api/provider/me", resolveUserFromBearer, requireProvider, async (req, res) => {
    res.json(safeProviderProfile(req.user!));
  });

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
      if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });
      const existing = await loadProviderMutableBooking(req, res, bookingId);
      if (!existing) return;
      if (!["assigned", "confirmed", "on_the_way", "arrived", "in_progress"].includes(existing.status)) {
        return res.status(409).json({ code: "INVALID_BOOKING_STATE", error: "Location cannot be updated in the current booking state" });
      }
      
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
      
      sendBookingEvent(booking, JSON.parse(message));
      
      res.json(booking);
    } catch (error) {
      console.error("Update provider location for booking error:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.patch("/api/provider/status", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const { status } = req.body;
    if (status !== "online" && status !== "offline") {
      return res.status(400).json({ code: "INVALID_PROVIDER_STATUS", error: "Provider status must be online or offline" });
    }
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
    let userId: number | undefined = req.user?.id;

    // Also support Clerk bearer token auth for customers
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const { clerkClient: cc } = await import("@clerk/clerk-sdk-node");
          const verified = await cc.verifyToken(token);
          if (verified?.sub) {
            const localUser = await storage.getUserByUsername(`clerk_${verified.sub}`);
            if (localUser) userId = localUser.id;
          }
        } catch {
          // fall through
        }
      }
    }

    if (!userId) return res.sendStatus(401);

    try {
      const { name, email, phone, address, description, profileImage, birthday } = req.body;
      const updatedUser = await storage.updateUserProfile(userId, {
        name,
        email,
        phone,
        address,
        description,
        ...(birthday !== undefined && { birthday }),
        ...(profileImage !== undefined && { profileImage }),
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.delete("/api/user", async (req, res) => {
    let userId: number | undefined = req.user?.id;

    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const { clerkClient: cc } = await import("@clerk/clerk-sdk-node");
          const verified = await cc.verifyToken(token);
          if (verified?.sub) {
            const localUser = await storage.getUserByUsername(`clerk_${verified.sub}`);
            if (localUser) userId = localUser.id;
          }
        } catch {
          // fall through
        }
      }
    }

    if (!userId) return res.sendStatus(401);

    try {
      await storage.deleteUser(userId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/bookings/active", isProvider, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const bookings = await storage.getActiveBookings(req.user.id);
    res.json(bookings);
  });

  // Native transactional quote and PaymentSheet contract.
  app.post("/api/availability/asap", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      return res.json(await getAsapAvailability(req.user.id, req.body));
    } catch (error) {
      return nativeContractError(res, error);
    }
  });

  app.post("/api/quotes", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const quote = await createNativeQuote(req.user.id, requireIdempotencyKey(req), req.body);
      return res.status(201).json(serializeQuote(quote));
    } catch (error) {
      return nativeContractError(res, error);
    }
  });

  app.post("/api/bookings", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const quoteId = typeof req.body?.quoteId === "string" ? req.body.quoteId.trim() : "";
      if (!quoteId) throw new NativeContractError(400, "QUOTE_ID_REQUIRED", "quoteId is required; client prices are not accepted.");
      const booking = await createBookingFromQuote(req.user.id, quoteId, requireIdempotencyKey(req));
      return res.status(201).json(booking);
    } catch (error) {
      return nativeContractError(res, error);
    }
  });

  app.post("/api/bookings/:id/payment-sheet", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const bookingId = Number(req.params.id);
      if (!Number.isInteger(bookingId) || bookingId <= 0) throw new NativeContractError(400, "INVALID_BOOKING_ID", "Invalid booking ID.");
      const idempotencyKey = requireIdempotencyKey(req);
      const booking = await nativePaymentStatus(req.user.id, bookingId);
      if (!booking) throw new NativeContractError(404, "BOOKING_NOT_FOUND", "Booking not found.");
      if (booking.isPaid) return res.json({ bookingId, amountCents: booking.amount ?? 0, paymentStatus: booking.paymentStatus, clientSecret: null });
      if (["payment_failed", "payment_cancelled", "payment_expired", "failed", "cancelled", "expired"].includes((booking.paymentStatus ?? "").toLowerCase())) {
        throw new NativeContractError(410, "PAYMENT_ATTEMPT_CLOSED", "This payment attempt is closed; create a new quote and booking.");
      }
      const amountCents = booking.amount ?? Math.round((booking.totalPrice ?? 0) * 100);
      if (amountCents === 0) {
        const paid = await confirmZeroAmountBooking(booking.id);
        return res.json({ bookingId, amountCents: 0, paymentStatus: paid?.paymentStatus ?? "paid", clientSecret: null });
      }
      if (booking.stripeSessionId) {
        const { retrievePaymentSheetIntent } = await import("./payment-service");
        const existing = await retrievePaymentSheetIntent(booking.stripeSessionId);
        if (existing.client_secret && !["succeeded", "canceled"].includes(existing.status)) {
          return res.json({ bookingId, paymentIntentId: existing.id, clientSecret: existing.client_secret, amountCents: existing.amount, currency: existing.currency, paymentStatus: booking.paymentStatus });
        }
      }
      const customerId = await resolveOrCreateStripeCustomerId(req.user);
      const { createNativePaymentSheetIntent } = await import("./payment-service");
      const intent = await createNativePaymentSheetIntent({ bookingId, amountCents, customerId, idempotencyKey: `native:${bookingId}:${idempotencyKey}` });
      await attachNativePaymentIntent(bookingId, idempotencyKey, intent.paymentIntentId);
      return res.status(201).json({ bookingId, ...intent, currency: "usd", paymentStatus: "payment_pending" });
    } catch (error) {
      return nativeContractError(res, error);
    }
  });

  app.get("/api/bookings/:id/payment-status", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const bookingId = Number(req.params.id);
      if (!Number.isInteger(bookingId) || bookingId <= 0) throw new NativeContractError(400, "INVALID_BOOKING_ID", "Invalid booking ID.");
      const booking = await nativePaymentStatus(req.user.id, bookingId);
      return res.json({
        bookingId: booking!.id,
        bookingStatus: booking!.status,
        paymentStatus: booking!.paymentStatus,
        isPaid: booking!.isPaid,
        amountCents: booking!.amount ?? Math.round((booking!.totalPrice ?? 0) * 100),
        paymentExpiresAt: booking!.paymentExpiresAt,
      });
    } catch (error) {
      return nativeContractError(res, error);
    }
  });

  // Legacy web booking creation retained temporarily; native clients must not call it.
  app.post("/api/bookings/legacy", resolveUserFromBearer, async (req, res) => {
    if (!req.user) {
      console.log("Booking attempt without authentication");
      return res.status(401).json({ error: "Authentication required to create bookings. Please log in first." });
    }

    try {
      // ── Duplicate-booking guard ───────────────────────────────────────────
      // If this user already has an unpaid booking for the same service
      // created within the last hour, return it immediately instead of
      // creating a second booking (which would produce a second payment session).
      const incomingServiceId = Number(req.body.serviceId);
      if (!isNaN(incomingServiceId)) {
        const existingBooking = await storage.findRecentUnpaidBooking(
          req.user.id,
          incomingServiceId
        );
        if (existingBooking) {
          console.log(`[bookings] Reusing existing unpaid booking #${existingBooking.id} for user ${req.user.id}`);
          // Re-broadcast the job so providers that missed the original notification can see it
          return res.status(200).json(existingBooking);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user.id,
        status: 'pending', // Explicitly set status for new bookings
        serviceLatitude: req.body.serviceLatitude || null,
        serviceLongitude: req.body.serviceLongitude || null
      });

      // Resolve add-ons against the shared catalogue. Accept either an
      // `addOnIds: string[]` or a legacy `addOns: [{id}]` payload from older
      // clients. Pricing and duration are always recomputed server-side.
      const incomingAddOnIds: unknown = Array.isArray(req.body.addOnIds)
        ? req.body.addOnIds
        : Array.isArray(req.body.addOns)
          ? req.body.addOns
              .map((a: any) => (a && typeof a === "object" ? a.id : a))
              .filter((v: unknown): v is string => typeof v === "string")
          : [];
      const invalidAddOnIds = unknownAddOnIds(incomingAddOnIds, new Set(Object.keys(ADD_ONS_BY_ID)));
      if (invalidAddOnIds.length > 0) {
        return res.status(400).json({ code: "INVALID_ADD_ON", error: "One or more add-ons are not recognized.", invalidAddOnIds });
      }
      const { addOns: resolvedAddOns, addOnTotal, addOnDurationMinutes } =
        resolveBookingAddOns(incomingAddOnIds);

      // Authoritative total = base service price + add-on subtotal. Anything
      // beyond that (e.g. vehicle-size markup) is layered in by the client and
      // sent as `totalPrice`; we never trust it to be lower than base+add-ons.
      const service = await storage.getServiceById(bookingData.serviceId);
      const selectedTimeSlot = await storage.getTimeSlotById(bookingData.timeSlotId);
      if (
        !selectedTimeSlot ||
        !selectedTimeSlot.isAvailable ||
        selectedTimeSlot.currentBookings >= selectedTimeSlot.maxBookings
      ) {
        return res.status(409).json({
          code: "TIME_SLOT_UNAVAILABLE",
          error: "The selected time slot does not exist or is no longer available.",
        });
      }
      if (selectedTimeSlot.date !== req.body.date) {
        return res.status(400).json({
          code: "SLOT_DATE_MISMATCH",
          error: "The selected time slot does not match the booking date.",
        });
      }
      if (bookingData.vehicleId != null) {
        const vehicle = await storage.getVehicleById(bookingData.vehicleId);
        if (!vehicle || vehicle.userId !== req.user.id) {
          return res.status(403).json({ code: "VEHICLE_ACCESS_DENIED", error: "The selected vehicle does not belong to this account." });
        }
      }
      const basePrice = service?.price ?? 0;
      const clientTotal = Number(req.body.totalPrice);
      const minimumTotal = basePrice + addOnTotal;
      const finalTotal = Number.isFinite(clientTotal) && clientTotal >= minimumTotal
        ? Math.round(clientTotal)
        : minimumTotal;

      // Reserve extra time on the booking so detailers can plan accordingly.
      const baseDuration = service?.duration ?? 0;
      const totalDuration = baseDuration + addOnDurationMinutes;

      // Remove id from booking data since it's auto-generated
      const { id, ...bookingWithoutId } = bookingData;
      // Create a properly typed booking object with all required fields
      const booking = {
        userId: bookingWithoutId.userId,
        providerId: null, // Always null on creation — providers are assigned via accept-job flow
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
        serviceDuration: totalDuration,
        
        // Assignment system fields
        assignedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        assignmentExpiry: null,
        previousProviders: [],
        addOns: resolvedAddOns,
        addOnTotal,
        totalPrice: finalTotal,

        // Track the extra minutes contributed by add-ons so the assigned
        // detailer's job sheet shows the reserved time bump.
        extraTimeMinutes: addOnDurationMinutes,

        // Payment fields
        isPaid: false,
        paymentStatus: 'pending',
        paymentId: null,
        paymentDate: null,
        paymentUrl: null,
        stripeSessionId: null
      };

      const newBooking = await storage.createBooking(booking);

      // Send booking notification email to admin
      try {
        const customer = await storage.getUser(booking.userId);
        const service = await storage.getServiceById(booking.serviceId);
        await sendNewBookingEmail({
          bookingId: newBooking.id,
          customerName: [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.email || "Unknown",
          customerEmail: customer?.email,
          customerPhone: customer?.phone,
          serviceLocation: booking.serviceLocation,
          serviceName: service?.name,
          totalPrice: booking.totalPrice,
          date: booking.date,
          time: booking.time,
          priceTier: booking.priceTier,
          addOns: booking.addOns as any[],
        });
      } catch (emailErr) {
        console.error("[email] Booking notification failed (non-fatal):", emailErr);
      }

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
          
          if (!newBooking.isPaid || newBooking.status !== 'confirmed') return res.status(201).json(newBooking);
          // Notify nearby providers only after payment verification and confirmation.
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

  app.get("/api/bookings", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const bookings = await storage.getUserBookings(req.user.id);
    res.json(bookings);
  });
  
  app.get("/api/bookings/:id", resolveUserFromBearer, async (req, res) => {
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

    // Enrich with provider name so the tracking screen can show the real name
    let providerName: string | null = null;
    if (booking.providerId) {
      const provider = await storage.getUser(booking.providerId);
      providerName = provider?.name || provider?.username || null;
    }
    
    res.json({ ...booking, providerName });
  });
  
  app.get("/api/provider/active-bookings", async (req, res) => {
    if (!req.user?.isProvider) return res.status(403).send('Provider access required');
    
    const bookings = await storage.getActiveBookings(req.user.id);
    res.json(bookings);
  });

  // Vehicle endpoints
  app.get("/api/vehicles", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const vehicles = await storage.getUserVehicles(req.user.id);
    res.json(vehicles);
  });

  app.get("/api/vehicles/:id", resolveUserFromBearer, async (req, res) => {
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

  app.post("/api/vehicles", resolveUserFromBearer, async (req, res) => {
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

  app.patch("/api/vehicles/:id", resolveUserFromBearer, async (req, res) => {
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
      const updates = insertVehicleSchema
        .pick({
          year: true,
          make: true,
          model: true,
          color: true,
          licensePlate: true,
          notes: true,
        })
        .partial()
        .parse(req.body);
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "At least one editable vehicle field is required" });
      }
      const updatedVehicle = await storage.updateVehicle(id, updates);
      res.json(updatedVehicle);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An error occurred" });
    }
  });

  app.delete("/api/vehicles/:id", resolveUserFromBearer, async (req, res) => {
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

  // Saved address endpoints
  app.get("/api/addresses", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const addresses = await storage.getSavedAddresses(req.user.id);
    res.json(addresses);
  });

  app.post("/api/addresses", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const ownedAddress = (await storage.getSavedAddresses(req.user.id)).find(address => address.id === id);
      if (!ownedAddress) return res.status(404).json({ error: "Address not found" });
      const { label, address, isDefault } = req.body;
      if (!label || !address) return res.status(400).json({ error: "label and address are required" });
      const addr = await storage.createSavedAddress({
        userId: req.user.id,
        label: String(label).toLowerCase(),
        address: String(address),
        isDefault: Boolean(isDefault),
      });
      res.status(201).json(addr);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An error occurred" });
    }
  });

  app.patch("/api/addresses/:id", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send("Invalid ID");
    const ownedAddress = (await storage.getSavedAddresses(req.user.id)).find(address => address.id === id);
    if (!ownedAddress) return res.status(404).json({ error: "Address not found" });
    try {
      const { label, address, isDefault } = req.body;
      const updated = await storage.updateSavedAddress(id, {
        ...(label !== undefined ? { label: String(label).toLowerCase() } : {}),
        ...(address !== undefined ? { address: String(address) } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "An error occurred" });
    }
  });

  app.delete("/api/addresses/:id", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send("Invalid ID");
    const ownedAddress = (await storage.getSavedAddresses(req.user.id)).find(address => address.id === id);
    if (!ownedAddress) return res.status(404).json({ error: "Address not found" });
    await storage.deleteSavedAddress(id);
    res.sendStatus(204);
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  // Add-ons catalogue (single source of truth shared with the frontend)
  app.get("/api/add-ons", (_req, res) => {
    res.json(ADD_ONS);
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
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        code: "INVALID_DATE",
        error: "date is required in YYYY-MM-DD format.",
      });
    }
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

  // Customer-facing booking cancellation
  app.patch("/api/bookings/:id/cancel", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });
      const booking = await storage.getBookingById(bookingId);
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      if (booking.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      if (!["pending", "confirmed"].includes(booking.status)) {
        return res.status(409).json({ error: "Booking cannot be cancelled in its current state" });
      }
      // Enforce 2-hour cancellation policy
      const bookingSlot = booking.timeSlotId ? await storage.getTimeSlotById(booking.timeSlotId) : null;
      if (bookingSlot?.date && bookingSlot?.startTime) {
        const slotDateTime = new Date(`${bookingSlot.date}T${bookingSlot.startTime}`);
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
        if (slotDateTime < twoHoursFromNow) {
          return res.status(422).json({ error: "Cancellations within 2 hours of your appointment cannot be processed here. Please contact support at support@autodapr.com." });
        }
      }
      const updated = await storage.updateBookingStatus(bookingId, "cancelled");
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Service area pre-check — returns whether a lat/lng falls within our operating radius
  app.get("/api/service-area/check", async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: "lat and lng are required" });
    try {
      const providers = await storage.getNearbyProviders(lat, lng, 15);
      // Compute nearest provider distance (haversine, miles)
      let nearestProviderMiles: number | null = null;
      for (const p of providers) {
        if (p.latitude == null || p.longitude == null) continue;
        const R = 3958.8;
        const dLat = (p.latitude - lat) * Math.PI / 180;
        const dLon = (p.longitude - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (nearestProviderMiles === null || d < nearestProviderMiles) nearestProviderMiles = d;
      }
      res.json({ inServiceArea: providers.length > 0, providerCount: providers.length, nearestProviderMiles });
    } catch {
      // If the check fails, report in-area so we don't block customers
      res.json({ inServiceArea: true, providerCount: 0, nearestProviderMiles: null });
    }
  });

  // Save push notification token for the authenticated user
  app.post("/api/user/push-token", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { token, platform } = req.body || {};
    if (!token || typeof token !== "string") return res.status(400).json({ error: "token is required" });
    try {
      await storage.updateUserPushToken(req.user.id, token);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to store push token" });
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
    
    const newTimeSlot = await storage.createTimeSlot({ ...timeSlotWithoutId, isPublished: true });
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
      const provider = await storage.getUser(req.user.id);
      if (!provider) return res.sendStatus(401);

      const unassignedBookings = await storage.getUnassignedBookings();

      const providerHasLocation = provider.latitude != null && provider.longitude != null;

      // Filter out any jobs this provider has already passed on
      const unseenBookings = unassignedBookings.filter((b) => {
        const prev = Array.isArray(b.previousProviders) ? (b.previousProviders as number[]) : [];
        return !prev.includes(req.user!.id);
      });

      // Batch-load unique customers and vehicles for the visible bookings
      const uniqueUserIds = [...new Set(unseenBookings.map(b => b.userId))];
      const uniqueVehicleIds = [...new Set(unseenBookings.map(b => b.vehicleId).filter(Boolean))] as number[];

      const [customerMap, vehicleMap] = await Promise.all([
        Promise.all(uniqueUserIds.map(id => storage.getUser(id))).then(users =>
          Object.fromEntries(users.filter(Boolean).map(u => [u!.id, u!]))
        ),
        Promise.all(uniqueVehicleIds.map(id => storage.getVehicleById(id))).then(vs =>
          Object.fromEntries(vs.filter(Boolean).map(v => [v!.id, v!]))
        ),
      ]);

      const jobs = [];
      for (const booking of unseenBookings) {
        const bookingHasLocation = booking.serviceLatitude != null && booking.serviceLongitude != null;

        const customer = customerMap[booking.userId];
        const firstName = customer?.name ? customer.name.split(' ')[0] : null;

        const vehicle = booking.vehicleId ? vehicleMap[booking.vehicleId] : null;
        const vehicleLabel = vehicle
          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.color ? ` · ${vehicle.color}` : ''}`
          : null;

        const extra = { customerFirstName: firstName, vehicleLabel };

        if (providerHasLocation && bookingHasLocation) {
          const distance = calculateDistance(
            provider.latitude!,
            provider.longitude!,
            booking.serviceLatitude!,
            booking.serviceLongitude!
          );
          jobs.push({ ...booking, ...extra, distance: Math.round(distance * 10) / 10 });
        } else {
          jobs.push({ ...booking, ...extra, distance: null });
        }
      }

      res.json(jobs);
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

      // Only paid, confirmed, unassigned bookings are provider-visible.
      const booking = await storage.getBookingById(bookingId);
      if (!booking || !booking.isPaid || booking.status !== 'confirmed' || booking.providerId) {
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

  // Test Stripe connection endpoint
  app.get("/api/test-stripe", async (req, res) => {
    try {
      const hasKey = !!process.env.STRIPE_SECRET_KEY;
      const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!hasKey) {
        return res.json({
          status: "missing_credentials",
          credentials: { secret_key: hasKey, webhook_secret: hasWebhookSecret },
          message: "STRIPE_SECRET_KEY is not configured"
        });
      }
      
      const isLive = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
      
      res.json({
        status: "credentials_available",
        environment: isLive ? 'production' : 'test',
        webhookConfigured: hasWebhookSecret,
        message: "Stripe credentials are configured. Payment processing should work for bookings."
      });
    } catch (error: any) {
      console.error("Stripe connection test failed:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to test Stripe connection"
      });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
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
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const existing = await loadProviderMutableBooking(req, res, id);
      if (!existing) return;
      if (!["assigned", "confirmed", "arrived"].includes(existing.status)) {
        return res.status(409).json({ code: "INVALID_BOOKING_STATE", error: "Service cannot be started in the current booking state" });
      }
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
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const existing = await loadProviderMutableBooking(req, res, id);
      if (!existing) return;
      if (existing.status !== "in_progress") {
        return res.status(409).json({ code: "INVALID_BOOKING_STATE", error: "Only an in-progress booking can be completed" });
      }
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
      
      try {
        await storage.awardReferralForCompletedBooking(booking.id);
      } catch (e) {
        console.error('Referral credit error:', e);
      }

      res.json(booking);
    } catch (error) {
      res.status(404).send(error instanceof Error ? error.message : 'Booking not found or timer not started');
    }
  });
  
  // Payment endpoints
  app.post('/api/bookings/:id/create-payment', async (req, res) => {
    // Support Clerk bearer token in addition to Passport session
    if (!req.user) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const { clerkClient: cc } = await import("@clerk/clerk-sdk-node");
          const verified = await cc.verifyToken(token);
          if (verified?.sub) {
            const localUser = await storage.getUserByUsername(`clerk_${verified.sub}`);
            if (localUser) (req as any).user = localUser;
          }
        } catch {
          // fall through
        }
      }
    }

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

      // Validate promo code early so we can decide whether to reuse an existing intent.
      const PROMO_CODES: Record<string, number> = {
        'DAPR99': 99,
        'TEST99': 99,
      };
      const promoCodeRaw = typeof req.body.promoCode === 'string' ? req.body.promoCode.trim().toUpperCase() : null;
      const discountPercent = promoCodeRaw ? (PROMO_CODES[promoCodeRaw] ?? 0) : 0;
      if (promoCodeRaw && !PROMO_CODES[promoCodeRaw]) {
        return res.status(400).json({ error: 'Invalid promo code.' });
      }

      // If a PaymentIntent was already created for this booking, reuse it —
      // but only when no promo code or free-credit is being applied (those change the amount).
      const applyingDiscount = promoCodeRaw || req.body.useFreeWashCredit;
      if (!applyingDiscount && booking.stripeSessionId && booking.paymentStatus === 'pending') {
        try {
          const Stripe = (await import('stripe')).default;
          const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-04-22.dahlia' });
          const existing = await stripeInstance.paymentIntents.retrieve(booking.stripeSessionId);
          if (existing.client_secret && existing.status !== 'succeeded' && existing.status !== 'canceled') {
            return res.json({ paymentUrl: null, clientSecret: existing.client_secret, sessionId: existing.id, amountInCents: existing.amount });
          }
        } catch {
          // fall through to create a new intent
        }
      }
      
      // Handle free wash credit redemption
      if (req.body.useFreeWashCredit) {
        const consumed = await storage.consumeFreeWashCredit(req.user.id);
        if (!consumed) {
          return res.status(400).json({ error: 'No free wash credits available.' });
        }
        await storage.updateBookingPaymentInfo(booking.id, {
          isPaid: true,
          paymentStatus: 'completed',
          paymentDate: new Date().toISOString(),
        });
        return res.json({ paymentUrl: null, free: true });
      }

      // Resolve or create a Stripe customer for this user (works for both Clerk and non-Clerk users)
      const stripeCustomerId = await resolveOrCreateStripeCustomerId(req.user);
      
      // Get service details
      const service = await storage.getServiceById(booking.serviceId);
      if (!service) {
        return res.status(404).send('Service not found');
      }
      
      try {
        const { createPaymentLink } = await import('./payment-service');
        const siteUrl = process.env.SITE_URL ||
          `${req.protocol}://${req.get('host')}`;
        const { url, clientSecret, sessionId, amountInCents } = await createPaymentLink(booking, service, siteUrl, discountPercent, stripeCustomerId, Boolean(req.body.saveCard));
        
        // Update booking with payment info
        await storage.updateBookingPaymentInfo(booking.id, {
          paymentUrl: url || undefined,
          stripeSessionId: sessionId,
          paymentStatus: 'pending'
        });
        
        res.json({ paymentUrl: url, clientSecret, sessionId, amountInCents });
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

  // iOS-specific Stripe Checkout Session (opens in Safari View Controller → supports Apple Pay)
  app.post("/api/bookings/:id/ios-checkout", resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
      const booking = await storage.getBookingById(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
      if (booking.isPaid) return res.status(400).json({ error: 'Already paid' });

      const service = await storage.getServiceById(booking.serviceId);
      if (!service) return res.status(404).json({ error: 'Service not found' });

      const PROMO_CODES: Record<string, number> = { 'DAPR99': 99, 'TEST99': 99 };
      const promoRaw = typeof req.body.promoCode === 'string' ? req.body.promoCode.trim().toUpperCase() : null;
      const discountPercent = promoRaw ? (PROMO_CODES[promoRaw] ?? 0) : 0;

      const stripeCustomerId = await resolveOrCreateStripeCustomerId(req.user!);
      const { createIOSCheckoutSession } = await import('./payment-service');
      const { url, sessionId, amountInCents } = await createIOSCheckoutSession(booking, service, discountPercent, stripeCustomerId);

      await storage.updateBookingPaymentInfo(booking.id, {
        stripeSessionId: sessionId,
        paymentStatus: 'pending',
      });

      res.json({ url, sessionId, amountInCents });
    } catch (error) {
      console.error('iOS checkout session error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create checkout session' });
    }
  });
  
  // Confirm a PaymentIntent with a payment method tokenized on the client (iOS inline card form)
  app.post('/api/bookings/:id/confirm-payment', resolveUserFromBearer, async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId required' });
    try {
      const booking = await storage.getBookingById(id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
      if (booking.isPaid) return res.json({ success: true }); // idempotent

      const piId = booking.stripeSessionId;
      if (!piId || !piId.startsWith('pi_')) return res.status(400).json({ error: 'No PaymentIntent on this booking' });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-04-22.dahlia' as any });

      const intent = await stripe.paymentIntents.confirm(piId, {
        payment_method: paymentMethodId,
      } as any);

      if (intent.status === 'succeeded') {
        await storage.updateBookingPaymentInfo(id, { isPaid: true, paymentStatus: 'completed' });
        return res.json({ success: true });
      }
      if (intent.status === 'requires_action') {
        return res.json({ requiresAction: true });
      }
      return res.status(400).json({ error: `Payment status: ${intent.status}` });
    } catch (err: any) {
      console.error('confirm-payment error:', err);
      const msg = err?.raw?.message || err?.message || 'Payment failed';
      return res.status(400).json({ error: msg });
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
      
      // Verify payment status using Stripe
      const intentId = booking.stripeSessionId || booking.paymentId;
      if (intentId) {
        const { getPaymentDetails } = await import('./payment-service');
        const { isPaid, paymentMethod } = await getPaymentDetails(intentId);
        
        if (isPaid) {
          // Build the update — always back-fill paymentMethod if it was missing
          const needsUpdate =
            !booking.isPaid ||
            (paymentMethod && !booking.paymentMethod);
          
          if (needsUpdate) {
            await storage.updateBookingPaymentInfo(booking.id, {
              isPaid: true,
              paymentStatus: 'completed',
              paymentDate: booking.paymentDate || new Date().toISOString(),
              ...(paymentMethod ? { paymentMethod } : {}),
            });
            
            if (!booking.isPaid) {
              await storage.updateBookingStatus(booking.id, 'confirmed');
            }
          }
          
          return res.json({
            verified: true,
            status: 'completed',
            paymentMethod: paymentMethod ?? booking.paymentMethod ?? null,
          });
        }
      }
      
      res.json({ 
        verified: booking.isPaid, 
        status: booking.paymentStatus,
        paymentMethod: booking.paymentMethod ?? null,
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to verify payment' 
      });
    }
  });
  
  // Stripe webhook endpoint — receives events from Stripe.
  // Raw body parsing is applied in index.ts (before express.json()) for this path.
  app.post('/api/webhooks/stripe', async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not configured — webhook rejected. Set this env var to enable payment webhooks.');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      let event: import('stripe').Stripe.Event;
      try {
        const { constructWebhookEvent } = await import('./payment-service');
        event = constructWebhookEvent(req.body as Buffer, sig, webhookSecret);
      } catch (err: any) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      const markBookingPaid = async (bookingId: number, intentId: string, detectedMethod?: string | null) => {
        const result = await markNativeBookingPaid(bookingId, intentId, detectedMethod);
        if (result?.newlyPaid) {
          const userClients = clients.get(result.booking.userId) || [];
          const notification = JSON.stringify({ type: 'payment_completed', bookingId: result.booking.id });
          userClients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(notification); });
        }
      };

      try {
        if (event.type === 'payment_intent.succeeded') {
          const intent = event.data.object as import('stripe').Stripe.PaymentIntent;
          const bookingId = intent.metadata?.bookingId ? parseInt(intent.metadata.bookingId) : null;
          if (bookingId) {
            // Detect payment method from the intent's types list (no extra API call needed)
            let method: string | null = null;
            if (intent.payment_method_types?.includes('paypal')) method = 'paypal';
            else if (intent.payment_method_types?.length) method = 'card';
            await markBookingPaid(bookingId, intent.id, method);
          }
        }

        if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
          const intent = event.data.object as import('stripe').Stripe.PaymentIntent;
          const bookingId = intent.metadata?.bookingId ? parseInt(intent.metadata.bookingId) : null;
          if (bookingId) {
            await refundReferralCreditsForFailedPayment(
              bookingId,
              event.type === 'payment_intent.canceled' ? 'payment_cancelled' : 'payment_failed',
            );
          }
        }

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as import('stripe').Stripe.Checkout.Session;
          const bookingId = session.metadata?.bookingId ? parseInt(session.metadata.bookingId) : null;
          if (bookingId && session.payment_status === 'paid') {
            let method: string | null = null;
            if (session.payment_method_types?.includes('paypal')) method = 'paypal';
            else if (session.payment_method_types?.length) method = 'card';
            await markBookingPaid(bookingId, session.id, method);
          }
        }

        if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
          const session = event.data.object as import('stripe').Stripe.Checkout.Session;
          const bookingId = session.metadata?.bookingId ? parseInt(session.metadata.bookingId) : null;
          if (bookingId) await refundReferralCreditsForFailedPayment(bookingId, 'payment_expired');
        }

        res.status(200).end();
      } catch (error) {
        console.error('Stripe webhook handling error:', error);
        res.status(500).end();
      }
    }
  );

  // Rating endpoint
  app.post('/api/bookings/:id/rating', resolveUserFromBearer, async (req, res) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    
    const id = parseInt(req.params.id);
    const { rating, comment } = req.body;
    
    if (isNaN(id) || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).send('Invalid booking ID or rating (must be 1-5)');
    }
    
    try {
      // Verify this booking belongs to the user and has been completed
      const booking = await storage.getBookingById(id);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).send('Access denied');
      }
      if (booking.status !== 'completed') {
        return res.status(400).send('Ratings can only be submitted for completed bookings');
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

  // Tip endpoint — creates a Stripe Checkout for the tip amount.
  // Persists the pending tip reference (sessionId + expectedCents) to the DB so it
  // survives server restarts and horizontal scaling.
  app.post('/api/bookings/:id/tip', async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const { tipAmountCents } = req.body;

    if (isNaN(id) || typeof tipAmountCents !== 'number' || tipAmountCents < 100) {
      return res.status(400).send('Invalid booking ID or tip amount (minimum $1.00)');
    }

    try {
      const booking = await storage.getBookingById(id);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).send('Access denied');
      }
      if (booking.status !== 'completed') {
        return res.status(400).send('Tips can only be added to completed bookings');
      }
      if (booking.tipAmount !== null && booking.tipAmount !== undefined) {
        return res.status(409).send('A tip has already been recorded for this booking');
      }
      if (!booking.rating) {
        return res.status(400).send('Please submit a rating before adding a tip');
      }
      // Allow overwriting a stale/abandoned pending tip reference so customers
      // aren't permanently blocked if they close the Stripe tab without paying.

      const { createTipPaymentLink } = await import('./payment-service');
      const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
      const { url, sessionId } = await createTipPaymentLink(id, tipAmountCents, siteUrl);

      // Store the pending tip reference in the DB (durable — survives restarts)
      await storage.updatePendingTipReference(id, sessionId, tipAmountCents);

      // tipAmount is NOT persisted here — only after Stripe confirms payment
      res.json({ url });
    } catch (error) {
      console.error('Tip endpoint error:', error);
      res.status(500).send(error instanceof Error ? error.message : 'Failed to create tip payment');
    }
  });

  // Called by the frontend when Stripe redirects back with tip_paid=1.
  // Reads the pending reference from the DB (no client-supplied values trusted),
  // verifies against Stripe Sessions API, then persists tipAmount.
  app.post('/api/bookings/:id/tip/confirm', async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');

    try {
      const booking = await storage.getBookingById(id);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).send('Access denied');
      }
      if (booking.status !== 'completed') {
        return res.status(400).send('Tips can only be confirmed on completed bookings');
      }
      // Already confirmed — idempotent success
      if (booking.tipAmount !== null && booking.tipAmount !== undefined) {
        return res.json(booking);
      }

      // Read the pending reference from the DB
      if (!booking.pendingTipSessionId || !booking.pendingTipCents) {
        return res.status(400).send('No pending tip found for this booking');
      }

      // Verify the Stripe session is actually paid
      const { verifySessionPaid } = await import('./payment-service');
      const paid = await verifySessionPaid(booking.pendingTipSessionId);
      if (!paid) {
        return res.status(402).send('Tip payment not yet confirmed by Stripe');
      }

      // Payment verified — persist tipAmount and clear pending reference
      const updated = await storage.updateBookingTip(id, booking.pendingTipCents);
      res.json(updated);
    } catch (error) {
      console.error('Tip confirm error:', error);
      res.status(500).send(error instanceof Error ? error.message : 'Failed to confirm tip');
    }
  });


  // Add API endpoint to update booking status with notifications
  app.post('/api/bookings/:id/status', async (req, res) => {
    const { status, stage } = req.body;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).send('Invalid booking ID');
    }
    
    try {
      const existing = await loadProviderMutableBooking(req, res, id);
      if (!existing) return;
      if (!isAllowedProviderStatusTransition(existing.status, status)) {
        return res.status(409).json({ code: "INVALID_STATUS_TRANSITION", error: `Cannot transition booking from ${existing.status} to ${String(status)}` });
      }
      if (stage !== undefined && !isAllowedProviderStage(stage)) {
        return res.status(400).json({ code: "INVALID_BOOKING_STAGE", error: "Unsupported booking stage" });
      }
      // Update the booking status
      const booking = await storage.updateBookingStatus(id, status, stage);

      if (status === 'completed') {
        try {
          await storage.awardReferralForCompletedBooking(booking.id);
        } catch (error) {
          console.error('Referral credit error:', error);
        }
      }
      
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
  
  // Provider marks arrival — sets arrivalTime, calculates initial ETA, notifies customer
  app.post('/api/bookings/:id/arrive', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
      const existing = await loadProviderMutableBooking(req, res, id);
      if (!existing) return;
      if (!["assigned", "confirmed", "on_the_way"].includes(existing.status)) {
        return res.status(409).json({ code: "INVALID_BOOKING_STATE", error: "Arrival cannot be recorded in the current booking state" });
      }
      const { baseDurationMinutes = 60 } = req.body;
      const booking = await storage.markArrived(id, baseDurationMinutes);
      // Broadcast to ALL WebSocket clients (tracking page uses an unauthenticated socket)
      const arrivedMsg = JSON.stringify({
        type: 'provider_arrived',
        bookingId: booking.id,
        arrivalTime: booking.arrivalTime,
        estimatedCompletionTime: booking.estimatedCompletionTime,
        extraTimeMinutes: booking.extraTimeMinutes,
        timeAdjustments: booking.timeAdjustments,
      });
      sendBookingEvent(booking, JSON.parse(arrivedMsg));
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mark arrival' });
    }
  });

  // Provider advances service stage — broadcasts stage_update to customer tracking screen
  app.post('/api/bookings/:id/stage', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    const { stage } = req.body;
    if (!isAllowedProviderStage(stage)) return res.status(400).json({ code: "INVALID_BOOKING_STAGE", error: 'Unsupported booking stage' });
    try {
      const existing = await loadProviderMutableBooking(req, res, id);
      if (!existing) return;
      if (existing.status !== "in_progress") {
        return res.status(409).json({ code: "INVALID_BOOKING_STATE", error: "Stages can only be updated while service is in progress" });
      }
      const booking = await storage.updateBookingStage(id, stage);
      const msg = JSON.stringify({ type: 'stage_update', bookingId: booking.id, stage });
      sendBookingEvent(booking, JSON.parse(msg));
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update stage' });
    }
  });

  // Provider updates time adjustments — recalculates ETA, notifies customer
  app.patch('/api/bookings/:id/time-adjustments', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
      const existing = await loadProviderMutableBooking(req, res, id);
      if (!existing) return;
      if (existing.status !== "in_progress") {
        return res.status(409).json({ code: "INVALID_BOOKING_STATE", error: "Time adjustments require an in-progress booking" });
      }
      const { adjustments, providerNotes } = req.body;
      if (!Array.isArray(adjustments)) return res.status(400).json({ error: 'adjustments must be an array' });
      const booking = await storage.updateTimeAdjustments(id, adjustments, providerNotes);
      // Broadcast to ALL WebSocket clients (tracking page uses an unauthenticated socket)
      const etaMsg = JSON.stringify({
        type: 'eta_update',
        bookingId: booking.id,
        estimatedCompletionTime: booking.estimatedCompletionTime,
        extraTimeMinutes: booking.extraTimeMinutes,
        timeAdjustments: booking.timeAdjustments,
      });
      sendBookingEvent(booking, JSON.parse(etaMsg));
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update adjustments' });
    }
  });

  // Booking photo endpoints
  app.get('/api/bookings/:id/photos', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
      const photos = await storage.getBookingPhotos(id);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch photos' });
    }
  });

  app.post('/api/bookings/:id/photos', async (req, res) => {
    if (!req.user?.isProvider) return res.status(403).json({ error: 'Provider access required' });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });
    const { photoType, dataUrl, caption } = req.body;
    if (!photoType || !dataUrl) return res.status(400).json({ error: 'photoType and dataUrl are required' });
    if (!['before', 'after'].includes(photoType)) return res.status(400).json({ error: 'photoType must be before or after' });
    try {
      const photo = await storage.addBookingPhoto(id, photoType, dataUrl, caption);
      res.json(photo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save photo' });
    }
  });

  app.delete('/api/bookings/:id/photos/:photoId', async (req, res) => {
    if (!req.user?.isProvider) return res.status(403).json({ error: 'Provider access required' });
    const photoId = parseInt(req.params.photoId);
    if (isNaN(photoId)) return res.status(400).json({ error: 'Invalid photo ID' });
    try {
      await storage.deleteBookingPhoto(photoId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete photo' });
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

  app.get('/api/admin/passed-jobs', isAdmin, async (req, res) => {
    try {
      const jobs = await storage.getPassedJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Failed to get passed jobs');
    }
  });

  // Backend-assisted sign-up completion — used when a stale sign-up has an unverified
  // email stuck to it and the user does not want to verify email.
  // Creates the user via Clerk admin API and returns a short-lived sign-in token.
  app.post('/api/auth/clerk/complete-signup', async (req: Request, res: Response) => {
    try {
      const { email, phoneNumber, firstName, lastName, password } = req.body as {
        email?: string;
        phoneNumber?: string;
        firstName: string;
        lastName: string;
        password?: string;
      };
      if (!phoneNumber && !email) return res.status(400).json({ error: 'Email or phone number required' });

      // Check if user already exists by phone (primary identifier)
      let clerkUser: any = null;
      if (phoneNumber) {
        try {
          const byPhone = await clerkClient.users.getUserList({ phoneNumber: [phoneNumber] });
          const byPhoneArr: any[] = Array.isArray(byPhone) ? byPhone : ((byPhone as any).data ?? []);
          clerkUser = byPhoneArr[0] ?? null;
        } catch { /* fall through */ }
      }

      // Also check by email if provided and not found by phone
      if (!clerkUser && email) {
        try {
          const byEmail = await clerkClient.users.getUserList({ emailAddress: [email] });
          const byEmailArr: any[] = Array.isArray(byEmail) ? byEmail : ((byEmail as any).data ?? []);
          clerkUser = byEmailArr[0] ?? null;
        } catch { /* getUserList may throw — fall through to create */ }
      }

      if (!clerkUser) {
        const createParams: any = {
          firstName: firstName || 'New',
          lastName: lastName || 'User',
          skipPasswordChecks: true,
          skipPasswordRequirement: true,
        };
        if (phoneNumber) createParams.phoneNumber = [phoneNumber];
        if (email) createParams.emailAddress = [email];
        if (password) createParams.password = password;
        clerkUser = await clerkClient.users.createUser(createParams);
      } else if (password) {
        // Update password on existing user
        await clerkClient.users.updateUser(clerkUser.id, { password, skipPasswordChecks: true });
      }

      return res.json({ userId: clerkUser.id });
    } catch (err: any) {
      console.error('clerk/complete-signup error:', err);
      // Extract the most useful message from a Clerk API error
      const clerkMsg: string =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        'Failed to complete sign-up';
      // Surface "already exists" as a friendly message
      const friendly = /already.*exist|taken|duplicate/i.test(clerkMsg)
        ? 'An account with that email already exists. Please sign in instead.'
        : clerkMsg;
      return res.status(500).json({ error: friendly });
    }
  });

  // Clerk user sync - creates/fetches user in local DB and establishes session
  app.post('/api/auth/clerk-sync', clerkAuthMiddleware, async (req: ClerkRequest, res: Response) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkUserId = req.auth.userId;
      
      // Get Clerk user info
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      // Check if we already have a user with this Clerk ID (stored in username for now)
      const clerkUsername = `clerk_${clerkUserId}`;
      let user = await storage.getUserByUsername(clerkUsername);
      
      if (!user) {
        // Create a new user in our database
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const phone = clerkUser.phoneNumbers[0]?.phoneNumber;
        const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
        
        user = await storage.createUser({
          username: clerkUsername,
          password: Math.random().toString(36), // Random password, won't be used
          isProvider: false,
          isAdmin: false,
          name: name || 'User',
          email: email || null,
          phone: phone || null
        });
      }
      // Client-supplied role/provider/admin fields are intentionally ignored.
      // Provider/admin access is determined solely by backend-owned DB fields.
      
      // Establish passport session for this user
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json(safeUser(user));
    } catch (error) {
      console.error('Clerk sync error:', error);
      res.status(500).json({ error: 'Failed to sync Clerk user' });
    }
  });

  // Clerk-authenticated secure routes
  app.get('/api/secure/me', clerkAuthMiddleware, async (req: ClerkRequest, res: Response) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkUserId = req.auth.userId;
      
      // Get Clerk user info
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      // Check if user is linked to Stripe
      const stripeMapping = await storage.getClerkStripeMapping(clerkUserId);
      
      res.json({
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || null,
        phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        stripeCustomerId: stripeMapping?.stripeCustomerId || null,
        isLinkedToStripe: !!stripeMapping
      });
    } catch (error) {
      console.error('Secure /me error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  app.post('/api/secure/link-stripe', clerkAuthMiddleware, async (req: ClerkRequest, res: Response) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkUserId = req.auth.userId;
      
      // Check if already linked
      const existingMapping = await storage.getClerkStripeMapping(clerkUserId);
      if (existingMapping) {
        return res.json({ stripeCustomerId: existingMapping.stripeCustomerId });
      }
      
      // Get Clerk user info
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      const phone = clerkUser.phoneNumbers[0]?.phoneNumber;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
      
      // Create Stripe customer
      const { createStripeCustomer } = await import('./payment-service');
      const stripeCustomerId = await createStripeCustomer(email, phone, name);
      
      // Create mapping
      const mapping = await storage.createClerkStripeMapping({
        clerkUserId,
        stripeCustomerId,
        email: email || null,
        phone: phone || null,
        name: name || null,
        createdAt: new Date().toISOString()
      });
      
      res.json({ stripeCustomerId: mapping.stripeCustomerId });
    } catch (error) {
      console.error('Link Stripe error:', error);
      res.status(500).json({ error: 'Failed to link Stripe customer' });
    }
  });

  // ── Saved payment methods routes ─────────────────────────────────────────
  async function resolveUserFromRequest(req: any): Promise<boolean> {
    if (req.user) return true;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { clerkClient: cc } = await import('@clerk/clerk-sdk-node');
        const verified = await cc.verifyToken(token);
        if (verified?.sub) {
          const localUser = await storage.getUserByUsername(`clerk_${verified.sub}`);
          if (localUser) { (req as any).user = localUser; return true; }
        }
      } catch { }
    }
    return false;
  }

  app.get('/api/payment-methods', async (req, res) => {
    if (!await resolveUserFromRequest(req)) return res.sendStatus(401);
    try {
      // Use the unified resolver so existing Clerk-linked users without a populated
      // users.stripe_customer_id still see their saved cards on first load.
      const stripeCustomerId = await resolveOrCreateStripeCustomerId(req.user!);
      if (!stripeCustomerId) return res.json({ methods: [] });
      const { listSavedPaymentMethods } = await import('./payment-service');
      const methods = await listSavedPaymentMethods(stripeCustomerId);
      res.json({ methods });
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ error: 'Failed to get payment methods' });
    }
  });

  app.delete('/api/payment-methods/:pmId', async (req, res) => {
    if (!await resolveUserFromRequest(req)) return res.sendStatus(401);
    const { pmId } = req.params;
    if (!pmId.startsWith('pm_')) return res.status(400).json({ error: 'Invalid payment method ID' });
    try {
      const stripeCustomerId = await resolveOrCreateStripeCustomerId(req.user!);
      if (!stripeCustomerId) return res.status(403).json({ error: 'No payment account linked' });

      // Verify ownership: the payment method must belong to this user's Stripe customer
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-04-22.dahlia' });
      const pm = await stripeInstance.paymentMethods.retrieve(pmId);
      if (pm.customer !== stripeCustomerId) {
        return res.status(403).json({ error: 'Payment method does not belong to this account' });
      }

      const { detachPaymentMethod } = await import('./payment-service');
      await detachPaymentMethod(pmId);
      res.sendStatus(204);
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // ── Referral routes ──────────────────────────────────────────────────────
  app.get('/api/referrals/me', resolveUserFromBearer, async (req, res) => {
    if (!req.user) return referralAuthError(res);
    try {
      const info = await storage.getReferralInfo(req.user.id);
      res.json({ ...info, history: info.history.map(serializeReferral) });
    } catch (e) {
      console.error('Get referral info error:', e);
      res.status(500).json({ code: 'REFERRAL_SERVER_ERROR', message: 'Failed to get referral info.' });
    }
  });

  app.post('/api/referrals/apply', resolveUserFromBearer, async (req, res) => {
    if (!req.user) return referralAuthError(res);
    const { referralCode } = req.body;
    if (!referralCode || typeof referralCode !== 'string') {
      return res.status(400).json({ code: 'INVALID_REFERRAL_CODE', message: 'Referral code is required.' });
    }
    try {
      const referral = await storage.applyReferralCode(req.user.id, referralCode);
      res.status(201).json({
        referral: serializeReferral(referral),
        message: 'Referral code applied. You’ll receive $20 off your first eligible wash.',
      });
    } catch (e) {
      if (e instanceof ReferralError) {
        return res.status(e.code === 'REFERRAL_LIMIT_REACHED' ? 409 : 400).json({ code: e.code, message: e.message });
      }
      if ((e as any)?.code === '23505') {
        return res.status(409).json({ code: 'ALREADY_REFERRED', message: 'You have already applied a referral code.' });
      }
      console.error('Apply referral code error:', e);
      res.status(500).json({ code: 'REFERRAL_SERVER_ERROR', message: 'Failed to apply referral code.' });
    }
  });

  // Contact support endpoint
  app.post("/api/contact", async (req, res) => {
    const parsed = insertContactMessageSchema.safeParse({
      ...req.body,
      submittedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
      const message = await storage.createContactMessage(parsed.data);
      console.log(`[contact] New support request from ${message.name} <${message.email}> — callback: ${message.requestCallback}`);

      // Send emails (non-blocking): notify support team + confirm to customer
      import("./email-service").then(({ sendSupportNotificationEmail, sendSupportConfirmationEmail }) => {
        const emailPayload = {
          name: message.name,
          email: message.email,
          message: message.message,
          requestCallback: message.requestCallback,
          submittedAt: message.submittedAt,
        };
        sendSupportNotificationEmail(emailPayload).catch((err) => {
          console.error("[contact] Support notification email error:", err);
        });
        sendSupportConfirmationEmail(emailPayload).catch((err) => {
          console.error("[contact] Customer confirmation email error:", err);
        });
      }).catch((err) => {
        console.error("[contact] Failed to load email service:", err);
      });

      res.json({ success: true, id: message.id });
    } catch (error) {
      console.error("Contact submission error:", error);
      res.status(500).json({ error: "Failed to save contact message" });
    }
  });

  // Admin: get all contact messages
  app.get("/api/admin/contact-messages", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contact messages" });
    }
  });

  // Admin: mark a contact message as resolved
  app.patch("/api/admin/contact-messages/:id/resolve", isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });
    try {
      const updated = await storage.resolveContactMessage(id);
      res.json(updated);
    } catch (error: any) {
      if (error?.message === "Contact message not found") {
        return res.status(404).json({ error: "Contact message not found" });
      }
      res.status(500).json({ error: "Failed to resolve contact message" });
    }
  });
  
  // Admin: reopen a resolved contact message
  app.patch("/api/admin/contact-messages/:id/reopen", isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });
    try {
      const updated = await storage.reopenContactMessage(id);
      res.json(updated);
    } catch (error: any) {
      if (error?.message === "Contact message not found") {
        return res.status(404).json({ error: "Contact message not found" });
      }
      res.status(500).json({ error: "Failed to reopen contact message" });
    }
  });

  return httpServer;
}
