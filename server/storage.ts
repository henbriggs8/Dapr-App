import { users, bookings, services, timeSlots, vehicles, savedAddresses, pricingConfig, clerkStripeMapping, bookingPhotos, referrals, contactMessages, User, Booking, InsertBooking, InsertUser, PricingConfig, Service, TimeSlot, InsertService, InsertTimeSlot, Vehicle, InsertVehicle, ClerkStripeMapping, InsertClerkStripeMapping, BookingPhoto, Referral, ContactMessage, InsertContactMessage, SavedAddress } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, gt, desc, asc, sql, isNull, or, inArray } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
const MemoryStore = createMemoryStore(session);

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Canonical four marketing tiers shown on /services. Categories map 1:1
// so the booking screen, predictive logic, and seed all stay in sync.
export const TIER_SEEDS: InsertService[] = [
  {
    name: "Essential Wash",
    description: "Hand wash, spray wax, vacuum, quick interior wipe-down",
    price: 39,
    duration: 30,
    category: "basic",
  },
  {
    name: "Interior Detail",
    description: "Full vacuum, surface cleaning, seat cleaning, light stain treatment",
    price: 89,
    duration: 60,
    category: "interior",
  },
  {
    name: "Refresh Detail",
    description: "Complete interior/exterior refresh with upgraded wheels and tire shine",
    price: 149,
    duration: 90,
    category: "standard",
  },
  {
    name: "Dapr Black Label Detail",
    description: "Showroom-finish results from a senior detailer with our most thorough interior and exterior work",
    price: 299,
    duration: 180,
    category: "premium",
  },
];

export interface IStorage {
  initialize(): Promise<void>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'address' | 'description' | 'profileImage'>>): Promise<User>;
  updateUserStripeCustomerId(id: number, stripeCustomerId: string): Promise<void>;
  deleteUser(id: number): Promise<void>;
  getProviders(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getUserBookings(userId: number): Promise<Booking[]>;
  findRecentUnpaidBooking(userId: number, serviceId: number): Promise<Booking | undefined>;
  getActiveBookings(providerId: number): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string, stage?: string): Promise<Booking>;
  updateProviderLocation(userId: number, latitude: number, longitude: number): Promise<void>;
  updateProviderStatus(userId: number, status: string): Promise<User>;
  getPricingConfig(): Promise<PricingConfig>;
  updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig>;
  
  // Booking assignment system methods
  getNearbyProviders(latitude: number, longitude: number, radius: number): Promise<User[]>;
  assignBookingToProvider(bookingId: number, providerId: number): Promise<Booking>;
  acceptBooking(bookingId: number, providerId: number): Promise<Booking>;
  rejectBooking(bookingId: number, providerId: number): Promise<Booking>;
  findBookingAssignment(providerId: number): Promise<Booking | undefined>;
  getBookingsByTimeframe(providerId: number, timeframe: 'day' | 'week' | 'month'): Promise<Booking[]>;
  getUnassignedBookings(): Promise<Booking[]>;
  
  // Provider earnings and metrics
  getProviderEarnings(providerId: number, period?: string): Promise<{ 
    totalEarnings: number;
    completedServices: number;
    averageRating: number;
    serviceTypeBreakdown: { [key: string]: number };
  }>;
  getProviderServiceMetrics(providerId: number): Promise<{
    averageDuration: { [key: string]: number };
    totalServiceTime: number;
  }>;
  
  // Admin dashboards
  getRevenueByLocation(): Promise<{
    totalRevenue: number;
    locationData: {
      latitude: number;
      longitude: number;
      location: string;
      revenue: number;
      bookingsCount: number;
    }[];
  }>;
  getProviderStatusSummary(): Promise<{
    totalProviders: number;
    onlineProviders: number;
    onlineProvidersList: { id: number; name: string; username: string; latitude?: number; longitude?: number; lastLocationUpdate?: string; }[];
    allProviders: { id: number; name: string; username: string; status: string; latitude?: number; longitude?: number; lastLocationUpdate?: string; }[];
  }>;
  
  // Booking timing methods
  startServiceTimer(bookingId: number): Promise<Booking>;
  completeServiceTimer(bookingId: number): Promise<Booking>;
  
  // Rating methods
  addBookingRating(bookingId: number, rating: number, comment?: string): Promise<Booking>;
  updateBookingTip(bookingId: number, tipAmount: number): Promise<Booking>;
  updatePendingTipReference(bookingId: number, orderId: string, tipCents: number): Promise<Booking>;
  
  // Vehicle methods
  getUserVehicles(userId: number): Promise<Vehicle[]>;
  getVehicleById(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, updates: Partial<Vehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<boolean>;
  
  // Service methods
  getServices(): Promise<Service[]>;
  getServiceById(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  
  // Time slot methods
  getTimeSlots(): Promise<TimeSlot[]>;
  getTimeSlotById(id: number): Promise<TimeSlot | undefined>;
  getAvailableTimeSlots(date?: string): Promise<TimeSlot[]>;
  createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot>;
  updateTimeSlot(id: number, updates: Partial<TimeSlot>): Promise<TimeSlot>;
  
  // Payment methods
  updateBookingPaymentInfo(
    bookingId: number, 
    paymentInfo: {
      paymentStatus?: string;
      paymentId?: string;
      paymentDate?: string;
      paymentUrl?: string;
      stripeSessionId?: string;
      isPaid?: boolean;
      paymentMethod?: string;
    }
  ): Promise<Booking>;
  
  getPendingPaymentBookings(): Promise<Booking[]>;
  
  // Rebooking analysis methods
  generateRebookingSuggestions(
    userId: number,
    userBookings: Booking[],
    services: Service[],
    timeSlots: TimeSlot[]
  ): Promise<any[]>;
  
  // GPS Tracking methods
  updateProviderLocationForBooking(
    bookingId: number, 
    latitude: number, 
    longitude: number
  ): Promise<Booking>;
  getActiveTrackingBookings(userId: number): Promise<Booking[]>;
  calculateETA(
    providerLat: number, 
    providerLng: number, 
    customerLat: number, 
    customerLng: number
  ): Promise<{ eta: string; distance: number }>;
  enableTrackingForBooking(bookingId: number): Promise<Booking>;
  // Time adjustment methods
  markArrived(bookingId: number, baseDurationMinutes: number): Promise<Booking>;
  updateTimeAdjustments(bookingId: number, adjustments: any[], providerNotes?: string): Promise<Booking>;

  getTrackingInfo(bookingId: number): Promise<{
    providerLocation: { lat: number; lng: number } | null;
    customerLocation: { lat: number; lng: number } | null;
    eta: string | null;
    distance: number | null;
    lastUpdate: string | null;
  } | null>;
  
  // Clerk-Stripe mapping methods
  getClerkStripeMapping(clerkUserId: string): Promise<ClerkStripeMapping | undefined>;
  createClerkStripeMapping(mapping: InsertClerkStripeMapping): Promise<ClerkStripeMapping>;
  upsertClerkStripeMapping(clerkUserId: string, stripeCustomerId: string): Promise<void>;

  // Referral methods
  getUserByReferralCode(code: string): Promise<User | undefined>;
  applyReferralCode(newUserId: number, code: string): Promise<{ success: boolean; message: string }>;
  getReferralInfo(userId: number): Promise<{ code: string; credits: number; referralCount: number; pendingCredits: number }>;
  consumeFreeWashCredit(userId: number): Promise<boolean>;
  creditReferrerForCompletedBooking(referredUserId: number): Promise<void>;

  // Booking photo methods
  addBookingPhoto(bookingId: number, photoType: string, dataUrl: string, caption?: string): Promise<BookingPhoto>;
  getBookingPhotos(bookingId: number): Promise<BookingPhoto[]>;
  deleteBookingPhoto(photoId: number): Promise<void>;

  // Contact message methods
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  resolveContactMessage(id: number): Promise<ContactMessage>;
  reopenContactMessage(id: number): Promise<ContactMessage>;

  // Saved address methods
  getSavedAddresses(userId: number): Promise<SavedAddress[]>;
  createSavedAddress(data: { userId: number; label: string; address: string; isDefault: boolean }): Promise<SavedAddress>;
  updateSavedAddress(id: number, updates: Partial<Pick<SavedAddress, 'label' | 'address' | 'isDefault'>>): Promise<SavedAddress>;
  deleteSavedAddress(id: number): Promise<boolean>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bookings: Map<number, Booking>;
  private services: Map<number, Service>;
  private timeSlots: Map<number, TimeSlot>;
  private vehicles: Map<number, Vehicle>;
  private savedAddressesMap: Map<number, SavedAddress>;
  private pricingConfig: PricingConfig;
  sessionStore: session.Store;
  currentUserId: number;
  currentBookingId: number;
  currentServiceId: number;
  currentTimeSlotId: number;
  currentVehicleId: number;
  currentSavedAddressId: number;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
    this.services = new Map();
    this.timeSlots = new Map();
    this.vehicles = new Map();
    this.savedAddressesMap = new Map();
    this.currentUserId = 1;
    this.currentBookingId = 1;
    this.currentServiceId = 1;
    this.currentTimeSlotId = 1;
    this.currentVehicleId = 1;
    this.currentSavedAddressId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Set default pricing
    this.pricingConfig = {
      id: 1,
      basic: 39,
      interior: 89,
      standard: 149,
      premium: 299,
      updatedAt: new Date().toISOString()
    };

    // Create a single car wash company instead of multiple providers
    this.createUser({
      username: "carwashcompany",
      password: "password",
      isProvider: true,
      name: "Dapr",
      description: "Premium car wash and detailing services for the discerning vehicle owner",
      latitude: 40.7128,
      longitude: -74.0060,
      profileImage: "https://images.unsplash.com/photo-1556745753-b2904692b3cd",
      currentStatus: "online"
    });

    // Create admin user - password will be hashed during creation
    this.initializeAdminUser().catch(console.error);
    
    // Create the four customer-facing service tiers (mirrors /services marketing copy)
    for (const tier of TIER_SEEDS) {
      this.createService(tier);
    }
    
    // Create some time slots for the next 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      // Create 8 time slots per day from 8 AM to 4 PM
      for (let hour = 8; hour <= 15; hour++) {
        const startHour = hour.toString().padStart(2, '0');
        const endHour = (hour + 1).toString().padStart(2, '0');
        this.createTimeSlot({
          date: dateString,
          startTime: `${startHour}:00`,
          endTime: `${endHour}:00`,
          isAvailable: true,
          maxBookings: 3,
          currentBookings: 0
        });
      }
    }

    // Create a test customer for demo purposes
    this.createUser({
      username: "testcustomer",
      password: "password123",
      name: "Sarah Johnson",
      phone: "+1 (555) 123-4567",
      address: "456 Oak Street, Salt Lake City, UT 84102"
    });

    // Create sample completed bookings to demonstrate rebooking feature
    this.createBooking({
      userId: 4,
      serviceId: 1, // Basic service
      timeSlotId: 1,
      providerId: 1,
      vehicleId: null,
      status: "completed",
      currentStage: null,
      rating: 5,
      ratingComment: "Great service!",
      priceTier: "basic",
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      serviceLocation: "456 Oak Street, Salt Lake City, UT 84102",
      serviceLocationType: "residential",
      serviceLatitude: 40.7589,
      serviceLongitude: -111.8883,
      notes: "Regular customer wash",
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: "09:00",
      amount: 3900,
      providerEarnings: 2900,
      startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      serviceDuration: 30,
      assignedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      assignmentExpiry: null,
      previousProviders: [],
      addOns: [],
      addOnTotal: 0,
      totalPrice: 3900,
      isPaid: true,
      paymentStatus: "completed",
      paymentId: "sample_payment_1",
      paymentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      paymentUrl: null,
      stripeSessionId: null,
    });
  }

  private async initializeAdminUser() {
    const hashedPassword = await hashPassword("admin123");
    this.createUser({
      username: "dapperadmin",
      password: hashedPassword,
      isAdmin: true,
      name: "System Administrator"
    });
  }

  async initialize(): Promise<void> {
    // MemStorage seeds data in constructor — nothing extra needed
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    
    // Hash password if it's not already hashed (doesn't contain a dot separator)
    let hashedPassword = insertUser.password;
    if (!insertUser.password.includes('.')) {
      hashedPassword = await hashPassword(insertUser.password);
    }
    
    const user: User = {
      id,
      ...insertUser,
      password: hashedPassword,
      rating: 5,
      ratingCount: 0,
      currentStatus: insertUser.currentStatus || 'offline',
      lastLocationUpdate: new Date().toISOString(),
      latitude: insertUser.latitude || null,
      longitude: insertUser.longitude || null,
      description: insertUser.description || null,
      profileImage: insertUser.profileImage || null,
      name: insertUser.name || null,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      address: insertUser.address || null,
      isProvider: insertUser.isProvider || false,
      isAdmin: insertUser.isAdmin || false,
      birthday: (insertUser as any).birthday ?? null,
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      freeWashCredits: 0,
      referredByCode: null,
      stripeCustomerId: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserProfile(id: number, updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'address' | 'description' | 'profileImage'>>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = {
      ...user,
      ...updates
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeCustomerId(id: number, stripeCustomerId: string): Promise<void> {
    const user = await this.getUser(id);
    if (user) this.users.set(id, { ...user, stripeCustomerId });
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async updateProviderLocation(userId: number, latitude: number, longitude: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user && user.isProvider) {
      this.users.set(userId, {
        ...user,
        latitude,
        longitude,
        lastLocationUpdate: new Date().toISOString()
      });
    }
  }

  async updateProviderStatus(userId: number, status: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user || !user.isProvider) {
      throw new Error('User not found or not a provider');
    }
    const updatedUser = {
      ...user,
      currentStatus: status
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getProviders(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.isProvider);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking: Booking = {
      id,
      userId: booking.userId,
      providerId: booking.providerId ?? null,
      serviceId: booking.serviceId,
      timeSlotId: booking.timeSlotId,
      vehicleId: booking.vehicleId ?? null,
      status: booking.status || 'pending',
      currentStage: booking.currentStage ?? null,
      rating: booking.rating ?? null,
      ratingComment: booking.ratingComment ?? null,
      priceTier: booking.priceTier,
      timestamp: booking.timestamp,
      serviceLocation: booking.serviceLocation,
      serviceLocationType: booking.serviceLocationType,
      serviceLatitude: booking.serviceLatitude ?? null,
      serviceLongitude: booking.serviceLongitude ?? null,
      notes: booking.notes ?? null,
      date: booking.date ?? null,
      time: booking.time ?? null,
      amount: booking.amount ?? null,
      providerEarnings: booking.providerEarnings ?? null,
      startTime: booking.startTime ?? null,
      endTime: booking.endTime ?? null,
      serviceDuration: booking.serviceDuration ?? null,
      assignedAt: booking.assignedAt ?? null,
      acceptedAt: booking.acceptedAt ?? null,
      rejectedAt: booking.rejectedAt ?? null,
      assignmentExpiry: booking.assignmentExpiry ?? null,
      previousProviders: booking.previousProviders ?? [],
      addOns: booking.addOns ?? [],
      addOnTotal: booking.addOnTotal ?? null,
      totalPrice: booking.totalPrice ?? null,
      isPaid: booking.isPaid ?? false,
      paymentStatus: booking.paymentStatus ?? 'pending',
      paymentId: booking.paymentId ?? null,
      paymentDate: booking.paymentDate ?? null,
      paymentUrl: booking.paymentUrl ?? null,
      stripeSessionId: booking.stripeSessionId ?? null,
      paymentMethod: booking.paymentMethod ?? null,
      tipAmount: booking.tipAmount ?? null,
      pendingTipSessionId: booking.pendingTipSessionId ?? null,
      pendingTipCents: booking.pendingTipCents ?? null,
      providerLatitude: booking.providerLatitude ?? null,
      providerLongitude: booking.providerLongitude ?? null,
      estimatedArrival: booking.estimatedArrival ?? null,
      lastLocationUpdate: booking.lastLocationUpdate ?? null,
      distanceToCustomer: booking.distanceToCustomer ?? null,
      trackingEnabled: booking.trackingEnabled ?? false,
      arrivalTime: booking.arrivalTime ?? null,
      extraTimeMinutes: booking.extraTimeMinutes ?? 0,
      estimatedCompletionTime: booking.estimatedCompletionTime ?? null,
      timeAdjustments: booking.timeAdjustments ?? [],
      providerNotes: booking.providerNotes ?? null,
      bookingRef: (() => { const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r='DAPR-'; for(let i=0;i<6;i++) r+=c[Math.floor(Math.random()*c.length)]; return r; })(),
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }

  async findRecentUnpaidBooking(userId: number, serviceId: number): Promise<Booking | undefined> {
    const cutoff = Date.now() - 60 * 60 * 1000; // 60 minutes
    return Array.from(this.bookings.values()).find(
      (b) =>
        b.userId === userId &&
        b.serviceId === serviceId &&
        !b.isPaid &&
        b.status === 'pending' &&
        new Date(b.timestamp).getTime() > cutoff
    );
  }

  async getActiveBookings(providerId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => 
        booking.providerId === providerId && 
        ['confirmed', 'in_progress', 'assigned'].includes(booking.status)
    );
  }
  
  async getBookingById(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async updateBookingStatus(id: number, status: string, stage?: string): Promise<Booking> {
    const booking = await this.getBookingById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // If status is changing to completed and there is start time, calculate duration
    let serviceDuration = booking.serviceDuration;
    if (status === 'completed' && booking.startTime && !booking.endTime) {
      const endTime = new Date().toISOString();
      const startTime = new Date(booking.startTime);
      const endTimeDate = new Date(endTime);
      
      // Calculate duration in minutes
      serviceDuration = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Get service details to calculate provider earnings
      const service = await this.getServiceById(booking.serviceId);
      const amount = service ? service.price * 100 : 0; // Convert to cents
      const providerEarnings = Math.round(amount * 0.7); // Provider gets 70%
      
      const updatedBooking = {
        ...booking,
        status,
        currentStage: stage || booking.currentStage,
        notes: booking.notes,
        endTime,
        serviceDuration,
        amount,
        providerEarnings
      };
      
      this.bookings.set(id, updatedBooking);
      return updatedBooking;
    }
    
    const updatedBooking = {
      ...booking,
      status,
      currentStage: stage || booking.currentStage,
      notes: booking.notes
    };
    
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
  
  // Provider metrics methods
  async getProviderEarnings(providerId: number, period: string = 'month'): Promise<{ 
    totalEarnings: number;
    completedServices: number;
    averageRating: number;
    serviceTypeBreakdown: { [key: string]: number };
  }> {
    // Get all completed bookings for this provider
    const bookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.providerId === providerId && booking.status === 'completed'
    );
    
    // Filter by time period if needed
    const now = new Date();
    let filteredBookings = bookings;
    
    if (period === 'today') {
      const today = now.toISOString().split('T')[0];
      filteredBookings = bookings.filter(booking => booking.date === today);
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      filteredBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.timestamp);
        return bookingDate >= weekAgo;
      });
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      filteredBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.timestamp);
        return bookingDate >= monthAgo;
      });
    }
    
    // Calculate total earnings (provider's cut)
    const totalEarnings = filteredBookings.reduce((sum, booking) => 
      sum + (booking.providerEarnings || 0), 0);
    
    // Count completed services
    const completedServices = filteredBookings.length;
    
    // Calculate average rating
    const validRatings = filteredBookings.filter(booking => booking.rating !== null);
    const averageRating = validRatings.length > 0 
      ? validRatings.reduce((sum, booking) => sum + (booking.rating || 0), 0) / validRatings.length
      : 0;
    
    // Get breakdown by service type
    const serviceTypeBreakdown: { [key: string]: number } = {};
    for (const booking of filteredBookings) {
      const service = await this.getServiceById(booking.serviceId);
      if (service) {
        const category = service.category;
        serviceTypeBreakdown[category] = (serviceTypeBreakdown[category] || 0) + 1;
      }
    }
    
    return {
      totalEarnings,
      completedServices,
      averageRating,
      serviceTypeBreakdown
    };
  }
  
  async getProviderServiceMetrics(providerId: number): Promise<{
    averageDuration: { [key: string]: number };
    totalServiceTime: number;
  }> {
    // Get all completed bookings with duration for this provider
    const bookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.providerId === providerId && 
                  booking.status === 'completed' && 
                  booking.serviceDuration !== null
    );
    
    // Calculate average duration by service type
    const durationByService: { [key: string]: number[] } = {};
    let totalServiceTime = 0;
    
    for (const booking of bookings) {
      const service = await this.getServiceById(booking.serviceId);
      if (service && booking.serviceDuration) {
        const category = service.category;
        if (!durationByService[category]) {
          durationByService[category] = [];
        }
        durationByService[category].push(booking.serviceDuration);
        totalServiceTime += booking.serviceDuration;
      }
    }
    
    // Calculate averages
    const averageDuration: { [key: string]: number } = {};
    for (const [category, durations] of Object.entries(durationByService)) {
      averageDuration[category] = Math.round(
        durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      );
    }
    
    return {
      averageDuration,
      totalServiceTime
    };
  }
  
  // Admin dashboard methods
  async getRevenueByLocation(): Promise<{
    totalRevenue: number;
    locationData: {
      latitude: number;
      longitude: number;
      location: string;
      revenue: number;
      bookingsCount: number;
    }[];
  }> {
    // Get all completed bookings
    const completedBookings = Array.from(this.bookings.values()).filter(
      booking => booking.status === 'completed' && booking.amount
    );
    
    // Calculate total revenue
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    
    // Group by location
    const locationMap = new Map<string, {
      latitude: number;
      longitude: number;
      location: string;
      revenue: number;
      bookingsCount: number;
    }>();
    
    for (const booking of completedBookings) {
      // Create a unique location key
      const lat = booking.serviceLatitude;
      const lng = booking.serviceLongitude;
      
      if (lat && lng) {
        // Round to 2 decimal places for location grouping
        const roundedLat = Math.round(lat * 100) / 100;
        const roundedLng = Math.round(lng * 100) / 100;
        const locationKey = `${roundedLat},${roundedLng}`;
        
        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, {
            latitude: lat,
            longitude: lng,
            location: booking.serviceLocation || 'Unknown location',
            revenue: 0,
            bookingsCount: 0
          });
        }
        
        const locationData = locationMap.get(locationKey)!;
        locationData.revenue += booking.amount || 0;
        locationData.bookingsCount += 1;
      }
    }
    
    return {
      totalRevenue,
      locationData: Array.from(locationMap.values())
    };
  }
  
  async getProviderStatusSummary(): Promise<{
    totalProviders: number;
    onlineProviders: number;
    onlineProvidersList: { id: number; name: string; username: string; latitude?: number; longitude?: number; lastLocationUpdate?: string; }[];
    allProviders: { id: number; name: string; username: string; status: string; latitude?: number; longitude?: number; lastLocationUpdate?: string; }[];
  }> {
    const providers = await this.getProviders();
    const onlineProviders = providers.filter(provider => provider.currentStatus === 'online');
    const onlineProvidersList = onlineProviders.map(provider => ({
      id: provider.id,
      name: provider.name || '',
      username: provider.username,
      latitude: provider.latitude === null ? undefined : provider.latitude,
      longitude: provider.longitude === null ? undefined : provider.longitude,
      lastLocationUpdate: provider.lastLocationUpdate === null ? undefined : provider.lastLocationUpdate
    }));
    return {
      totalProviders: providers.length,
      onlineProviders: onlineProviders.length,
      onlineProvidersList,
      allProviders: providers.map(p => ({
        id: p.id,
        name: p.name || p.username,
        username: p.username,
        status: p.currentStatus || 'offline',
        latitude: p.latitude === null ? undefined : p.latitude,
        longitude: p.longitude === null ? undefined : p.longitude,
        lastLocationUpdate: p.lastLocationUpdate === null ? undefined : p.lastLocationUpdate
      }))
    };
  }
  
  // Service timing methods
  async startServiceTimer(bookingId: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Update booking with start time
    const startTime = new Date().toISOString();
    const updatedBooking = {
      ...booking,
      startTime,
      status: 'in_progress',
      currentStage: booking.currentStage || 'on_the_way'
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async completeServiceTimer(bookingId: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (!booking.startTime) {
      throw new Error('Cannot complete service that has not been started');
    }
    
    // Calculate duration
    const endTime = new Date().toISOString();
    const startTime = new Date(booking.startTime);
    const endTimeDate = new Date(endTime);
    const serviceDuration = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60));
    
    // Get service details to calculate provider earnings
    const service = await this.getServiceById(booking.serviceId);
    const amount = service ? service.price * 100 : 0; // Convert to cents
    const providerEarnings = Math.round(amount * 0.7); // Provider gets 70%
    
    const updatedBooking = {
      ...booking,
      status: 'completed',
      currentStage: 'completed',
      endTime,
      serviceDuration,
      amount,
      providerEarnings
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  // Rating methods
  async addBookingRating(bookingId: number, rating: number, comment?: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Update booking with rating and comment
    const updatedBooking = {
      ...booking,
      rating,
      ratingComment: comment || null
    };
    
    this.bookings.set(bookingId, updatedBooking);
    
    // Update provider rating (idempotent: handle re-rating)
    if (booking.providerId !== null) {
      const provider = await this.getUser(booking.providerId);
      if (provider) {
        const currentRatingCount = provider.ratingCount || 0;
        const currentRating = provider.rating || 5;

        let newRatingCount: number;
        let newRating: number;

        if (booking.rating !== null && booking.rating !== undefined) {
          // Booking already had a rating — replace it in the running average
          if (currentRatingCount <= 1) {
            newRatingCount = 1;
            newRating = rating;
          } else {
            newRatingCount = currentRatingCount;
            newRating = ((currentRating * currentRatingCount) - booking.rating + rating) / currentRatingCount;
          }
        } else {
          // New rating — increment count
          newRatingCount = currentRatingCount + 1;
          newRating = ((currentRating * currentRatingCount) + rating) / newRatingCount;
        }

        this.users.set(provider.id, {
          ...provider,
          rating: newRating,
          ratingCount: newRatingCount
        });
      }
    }
    
    return updatedBooking;
  }

  async updateBookingTip(bookingId: number, tipAmount: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const updatedBooking = { ...booking, tipAmount, pendingTipSessionId: null, pendingTipCents: null };
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }

  async updatePendingTipReference(bookingId: number, sessionId: string, tipCents: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const updatedBooking = { ...booking, pendingTipSessionId: sessionId, pendingTipCents: tipCents };
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }

  async getPricingConfig(): Promise<PricingConfig> {
    return this.pricingConfig;
  }

  async updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig> {
    this.pricingConfig = { ...config, id: this.pricingConfig.id };
    // Sync service prices so customers see the updated prices immediately
    const categoryPriceMap: Record<string, number> = {
      basic: config.basic,
      interior: config.interior,
      standard: config.standard,
      premium: config.premium,
    };
    for (const [id, service] of Array.from(this.services.entries())) {
      if (service.category in categoryPriceMap) {
        this.services.set(id, { ...service, price: categoryPriceMap[service.category] });
      }
    }
    return this.pricingConfig;
  }
  
  // Service methods
  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }
  
  async getServiceById(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }
  
  async createService(service: InsertService): Promise<Service> {
    const id = this.currentServiceId++;
    const newService: Service = {
      ...service,
      id
    };
    this.services.set(id, newService);
    return newService;
  }
  
  // Time slot methods
  async getTimeSlots(): Promise<TimeSlot[]> {
    return Array.from(this.timeSlots.values());
  }
  
  async getTimeSlotById(id: number): Promise<TimeSlot | undefined> {
    return this.timeSlots.get(id);
  }
  
  async getAvailableTimeSlots(date?: string): Promise<TimeSlot[]> {
    let slots = Array.from(this.timeSlots.values()).filter(slot => slot.isAvailable && slot.currentBookings < slot.maxBookings);
    
    if (date) {
      slots = slots.filter(slot => slot.date === date);
    }
    
    // Sort by date and then by start time
    return slots.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }
  
  async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const id = this.currentTimeSlotId++;
    const newTimeSlot: TimeSlot = {
      ...timeSlot,
      id,
      isAvailable: timeSlot.isAvailable ?? true,
      maxBookings: timeSlot.maxBookings ?? 3,
      currentBookings: timeSlot.currentBookings ?? 0
    };
    this.timeSlots.set(id, newTimeSlot);
    return newTimeSlot;
  }
  
  async updateTimeSlot(id: number, updates: Partial<TimeSlot>): Promise<TimeSlot> {
    const timeSlot = await this.getTimeSlotById(id);
    if (!timeSlot) {
      throw new Error('Time slot not found');
    }
    
    const updatedTimeSlot = {
      ...timeSlot,
      ...updates
    };
    
    this.timeSlots.set(id, updatedTimeSlot);
    return updatedTimeSlot;
  }

  // Vehicle methods
  async getUserVehicles(userId: number): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(
      (vehicle) => vehicle.userId === userId
    );
  }

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = this.currentVehicleId++;
    const newVehicle: Vehicle = {
      ...vehicle,
      id,
      color: vehicle.color || null,
      licensePlate: vehicle.licensePlate || null,
      notes: vehicle.notes || null
    };
    this.vehicles.set(id, newVehicle);
    return newVehicle;
  }

  async updateVehicle(id: number, updates: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = await this.getVehicleById(id);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }
    
    const updatedVehicle = {
      ...vehicle,
      ...updates
    };
    
    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<boolean> {
    const vehicle = await this.getVehicleById(id);
    if (!vehicle) {
      return false;
    }
    
    return this.vehicles.delete(id);
  }

  async getSavedAddresses(userId: number): Promise<SavedAddress[]> {
    return Array.from(this.savedAddressesMap.values()).filter((a) => a.userId === userId);
  }

  async createSavedAddress(data: { userId: number; label: string; address: string; isDefault: boolean }): Promise<SavedAddress> {
    if (data.isDefault) {
      for (const [k, v] of this.savedAddressesMap.entries()) {
        if (v.userId === data.userId && v.isDefault) {
          this.savedAddressesMap.set(k, { ...v, isDefault: false });
        }
      }
    }
    const id = this.currentSavedAddressId++;
    const addr: SavedAddress = { id, ...data };
    this.savedAddressesMap.set(id, addr);
    return addr;
  }

  async updateSavedAddress(id: number, updates: Partial<Pick<SavedAddress, 'label' | 'address' | 'isDefault'>>): Promise<SavedAddress> {
    const existing = this.savedAddressesMap.get(id);
    if (!existing) throw new Error('Address not found');
    if (updates.isDefault) {
      for (const [k, v] of this.savedAddressesMap.entries()) {
        if (v.userId === existing.userId && v.isDefault && k !== id) {
          this.savedAddressesMap.set(k, { ...v, isDefault: false });
        }
      }
    }
    const updated = { ...existing, ...updates };
    this.savedAddressesMap.set(id, updated);
    return updated;
  }

  async deleteSavedAddress(id: number): Promise<boolean> {
    return this.savedAddressesMap.delete(id);
  }

  // Booking assignment system methods
  async getNearbyProviders(latitude: number | null, longitude: number | null, radius: number): Promise<User[]> {
    // Get all providers
    const providers = await this.getProviders().then(providers => 
      providers.filter(p => p.currentStatus === 'online')
    );
    
    // If latitude or longitude is null, return empty array
    if (latitude === null || longitude === null) {
      return [];
    }
    
    // Calculate distance and filter by radius (in kilometers)
    return providers.filter(provider => {
      if (!provider.latitude || !provider.longitude) return false;
      
      // Simple distance calculation using Haversine formula
      const R = 6371; // Earth radius in km
      const dLat = this.deg2rad(provider.latitude - latitude);
      const dLon = this.deg2rad(provider.longitude - longitude);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(latitude)) * Math.cos(this.deg2rad(provider.latitude)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c;
      
      return distance <= radius;
    });
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  async assignBookingToProvider(bookingId: number, providerId: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Atomic guard: reject if already claimed by another provider
    if (booking.status !== 'pending' || booking.providerId != null) {
      throw new Error('Job is no longer available');
    }
    
    const provider = await this.getUser(providerId);
    if (!provider || !provider.isProvider) {
      throw new Error('Provider not found');
    }
    
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 5 * 60000);
    
    const updatedBooking = {
      ...booking,
      providerId,
      status: 'assigned',
      assignedAt: now.toISOString(),
      assignmentExpiry: expiryTime.toISOString()
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async acceptBooking(bookingId: number, providerId: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.providerId !== providerId) {
      throw new Error('Booking not assigned to this provider');
    }
    
    if (booking.status !== 'assigned') {
      throw new Error('Booking is not in assigned state');
    }
    
    const now = new Date();
    const updatedBooking = {
      ...booking,
      status: 'confirmed',
      acceptedAt: now.toISOString()
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async rejectBooking(bookingId: number, providerId: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.providerId !== providerId) {
      throw new Error('Booking not assigned to this provider');
    }
    
    if (booking.status !== 'assigned') {
      throw new Error('Booking is not in assigned state');
    }
    
    // Add current provider to previous providers list
    const previousProviders = Array.isArray(booking.previousProviders) 
      ? [...booking.previousProviders, providerId]
      : [providerId];
    
    const now = new Date();
    const updatedBooking = {
      ...booking,
      providerId: null, // Reset provider
      status: 'pending', // Back to pending
      rejectedAt: now.toISOString(),
      previousProviders
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  // Fix the parameter nullable issue with this helper method
  private ensureNumber(value: number | null | undefined): number {
    // Default to 0 if null or undefined
    return value ?? 0;
  }
  
  async findBookingAssignment(providerId: number): Promise<Booking | undefined> {
    // Find the most recent booking assigned to this provider
    const assignments = Array.from(this.bookings.values()).filter(
      (booking) => 
        booking.providerId === providerId && 
        booking.status === 'assigned' &&
        booking.assignmentExpiry && 
        new Date(booking.assignmentExpiry) > new Date()
    );
    
    // Sort by assignment time, newest first
    assignments.sort((a, b) => {
      const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return assignments.length > 0 ? assignments[0] : undefined;
  }
  
  async getBookingsByTimeframe(providerId: number, timeframe: 'day' | 'week' | 'month'): Promise<Booking[]> {
    const allBookings = Array.from(this.bookings.values()).filter(
      (booking) => booking.providerId === providerId
    );
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (timeframe === 'day') {
      return allBookings.filter(booking => booking.date === today);
    }
    
    if (timeframe === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      
      return allBookings.filter(booking => {
        if (!booking.date) return false;
        const bookingDate = new Date(booking.date);
        return bookingDate >= weekAgo && bookingDate <= now;
      });
    }
    
    if (timeframe === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      
      return allBookings.filter(booking => {
        if (!booking.date) return false;
        const bookingDate = new Date(booking.date);
        return bookingDate >= monthAgo && bookingDate <= now;
      });
    }
    
    return allBookings;
  }
  
  async getUnassignedBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => 
        booking.status === 'pending' &&
        (!booking.providerId)
    );
  }
  
  // Payment methods
  async updateBookingPaymentInfo(
    bookingId: number, 
    paymentInfo: {
      paymentStatus?: string;
      paymentId?: string;
      paymentDate?: string;
      paymentUrl?: string;
      stripeSessionId?: string;
      isPaid?: boolean;
      paymentMethod?: string;
    }
  ): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    const updatedBooking = {
      ...booking,
      paymentStatus: paymentInfo.paymentStatus || booking.paymentStatus || 'pending',
      paymentId: paymentInfo.paymentId || booking.paymentId || null,
      paymentDate: paymentInfo.paymentDate || booking.paymentDate || null,
      paymentUrl: paymentInfo.paymentUrl || booking.paymentUrl || null,
      stripeSessionId: paymentInfo.stripeSessionId || booking.stripeSessionId || null,
      isPaid: paymentInfo.isPaid !== undefined ? paymentInfo.isPaid : booking.isPaid || false,
      paymentMethod: paymentInfo.paymentMethod || booking.paymentMethod || null,
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async getPendingPaymentBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.paymentStatus === 'pending' || booking.paymentStatus === 'processing'
    );
  }

  async generateRebookingSuggestions(
    userId: number,
    userBookings: Booking[],
    services: Service[],
    timeSlots: TimeSlot[]
  ): Promise<any[]> {
    const completedBookings = userBookings
      .filter(booking => booking.status === 'completed')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (completedBookings.length === 0) return [];

    const suggestions: any[] = [];

    // Analyze the most recent booking for immediate rebooking
    const mostRecent = completedBookings[0];
    const recentService = services.find(s => s.id === mostRecent.serviceId);
    
    if (recentService) {
      // Calculate suggested date based on service type and frequency
      const daysSinceLastService = Math.floor(
        (Date.now() - new Date(mostRecent.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      let suggestedDaysFromNow = 0;
      let reason = "";
      let confidence = 80;

      // Intelligent scheduling based on service type
      if (recentService.category === 'basic') {
        if (daysSinceLastService >= 14) {
          suggestedDaysFromNow = 1;
          reason = "Your car is due for a refresh";
          confidence = 90;
        } else if (daysSinceLastService >= 7) {
          suggestedDaysFromNow = 3;
          reason = "Maintain that fresh look";
          confidence = 75;
        }
      } else if (recentService.category === 'interior') {
        if (daysSinceLastService >= 30) {
          suggestedDaysFromNow = 1;
          reason = "Time to reset your interior";
          confidence = 90;
        } else if (daysSinceLastService >= 21) {
          suggestedDaysFromNow = 7;
          reason = "Keep your cabin feeling new";
          confidence = 75;
        }
      } else if (recentService.category === 'standard') {
        if (daysSinceLastService >= 21) {
          suggestedDaysFromNow = 1;
          reason = "Time for your regular detail";
          confidence = 95;
        } else if (daysSinceLastService >= 14) {
          suggestedDaysFromNow = 7;
          reason = "Keep your vehicle pristine";
          confidence = 80;
        }
      } else if (recentService.category === 'premium') {
        if (daysSinceLastService >= 45) {
          suggestedDaysFromNow = 1;
          reason = "Premium care is overdue";
          confidence = 95;
        } else if (daysSinceLastService >= 30) {
          suggestedDaysFromNow = 7;
          reason = "Maintain premium condition";
          confidence = 85;
        }
      }

      if (suggestedDaysFromNow > 0) {
        // Find preferred time based on history
        const preferredTimes = completedBookings
          .map(b => b.time)
          .filter(Boolean)
          .reduce((acc: {[key: string]: number}, time) => {
            if (time) {
              acc[time] = (acc[time] || 0) + 1;
            }
            return acc;
          }, {});

        const mostPreferredTime = Object.entries(preferredTimes)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || "09:00";

        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + suggestedDaysFromNow);
        
        // Find the best available time slot
        const availableSlots = timeSlots.filter(slot => 
          slot.date === suggestedDate.toISOString().split('T')[0] &&
          slot.isAvailable &&
          slot.currentBookings < slot.maxBookings
        );

        const preferredSlot = availableSlots.find(slot => 
          slot.startTime === mostPreferredTime
        ) || availableSlots[0];

        if (preferredSlot) {
          suggestions.push({
            booking: mostRecent,
            service: recentService,
            suggestedDate: suggestedDate.toISOString().split('T')[0],
            suggestedTime: preferredSlot.startTime,
            confidence,
            reason,
            timeSlot: preferredSlot
          });
        }
      }
    }

    // Analyze service upgrade opportunities
    const serviceFrequency = completedBookings.reduce((acc: {[key: string]: number}, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      if (service) {
        acc[service.category] = (acc[service.category] || 0) + 1;
      }
      return acc;
    }, {});

    // Suggest upgrade if customer frequently books basic services
    if (serviceFrequency.basic >= 3 && !serviceFrequency.standard) {
      const standardService = services.find(s => s.category === 'standard');
      if (standardService) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const availableSlots = timeSlots.filter(slot => 
          slot.date === nextWeek.toISOString().split('T')[0] &&
          slot.isAvailable &&
          slot.currentBookings < slot.maxBookings
        );

        if (availableSlots.length > 0) {
          suggestions.push({
            booking: mostRecent,
            service: standardService,
            suggestedDate: nextWeek.toISOString().split('T')[0],
            suggestedTime: availableSlots[0].startTime,
            confidence: 70,
            reason: "Ready for an upgrade? Try our premium service",
            timeSlot: availableSlots[0]
          });
        }
      }
    }

    return suggestions.slice(0, 2); // Return top 2 suggestions
  }

  // GPS Tracking methods for MemStorage (simplified implementation)
  async updateProviderLocationForBooking(bookingId: number, latitude: number, longitude: number): Promise<Booking> {
    throw new Error("GPS tracking not implemented in MemStorage");
  }
  async getActiveTrackingBookings(userId: number): Promise<Booking[]> {
    return [];
  }
  private memCalculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  async calculateETA(providerLat: number, providerLng: number, customerLat: number, customerLng: number): Promise<{ eta: string; distance: number }> {
    const distance = this.memCalculateDistance(providerLat, providerLng, customerLat, customerLng);
    const estimatedMinutes = Math.round((distance / 20) * 60);
    const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();
    return { eta, distance };
  }
  async enableTrackingForBooking(bookingId: number): Promise<Booking> {
    throw new Error("GPS tracking not implemented in MemStorage");
  }
  async getTrackingInfo(bookingId: number): Promise<any> {
    return null;
  }

  async markArrived(bookingId: number, baseDurationMinutes: number): Promise<Booking> {
    throw new Error("markArrived not implemented in MemStorage");
  }

  async updateTimeAdjustments(bookingId: number, adjustments: any[], providerNotes?: string): Promise<Booking> {
    throw new Error("updateTimeAdjustments not implemented in MemStorage");
  }

  // Clerk-Stripe mapping methods for MemStorage (not implemented)
  async getClerkStripeMapping(clerkUserId: string): Promise<ClerkStripeMapping | undefined> {
    throw new Error("Clerk-Stripe mapping not implemented in MemStorage");
  }
  async createClerkStripeMapping(mapping: InsertClerkStripeMapping): Promise<ClerkStripeMapping> {
    throw new Error("Clerk-Stripe mapping not implemented in MemStorage");
  }
  async upsertClerkStripeMapping(_clerkUserId: string, _stripeCustomerId: string): Promise<void> {
    throw new Error("upsertClerkStripeMapping not implemented in MemStorage");
  }

  // Booking photo methods for MemStorage (not implemented)
  async addBookingPhoto(bookingId: number, photoType: string, dataUrl: string, caption?: string): Promise<BookingPhoto> {
    throw new Error("addBookingPhoto not implemented in MemStorage");
  }
  async getBookingPhotos(bookingId: number): Promise<BookingPhoto[]> {
    throw new Error("getBookingPhotos not implemented in MemStorage");
  }
  async deleteBookingPhoto(photoId: number): Promise<void> {
    throw new Error("deleteBookingPhoto not implemented in MemStorage");
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> { throw new Error("Not implemented in MemStorage"); }
  async applyReferralCode(newUserId: number, code: string): Promise<{ success: boolean; message: string }> { throw new Error("Not implemented in MemStorage"); }
  async getReferralInfo(userId: number): Promise<{ code: string; credits: number; referralCount: number; pendingCredits: number }> { throw new Error("Not implemented in MemStorage"); }
  async consumeFreeWashCredit(userId: number): Promise<boolean> { throw new Error("Not implemented in MemStorage"); }
  async creditReferrerForCompletedBooking(referredUserId: number): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    throw new Error("createContactMessage not implemented in MemStorage");
  }
  async getContactMessages(): Promise<ContactMessage[]> {
    throw new Error("getContactMessages not implemented in MemStorage");
  }
  async resolveContactMessage(id: number): Promise<ContactMessage> {
    throw new Error("resolveContactMessage not implemented in MemStorage");
  }

  async reopenContactMessage(id: number): Promise<ContactMessage> {
    throw new Error("reopenContactMessage not implemented in MemStorage");
  }
}



export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const passwordToStore = insertUser.password.includes('.')
      ? insertUser.password
      : await hashPassword(insertUser.password);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: passwordToStore, referralCode })
      .returning();
    return user;
  }

  async updateUserProfile(id: number, updates: Partial<Pick<User, 'name' | 'email' | 'phone' | 'address' | 'description' | 'profileImage'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeCustomerId(id: number, stripeCustomerId: string): Promise<void> {
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateProviderLocation(userId: number, latitude: number, longitude: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        latitude, 
        longitude, 
        lastLocationUpdate: new Date().toISOString() 
      })
      .where(eq(users.id, userId));
  }

  async updateProviderStatus(userId: number, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ currentStatus: status })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getProviders(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isProvider, true));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let ref = 'DAPR-';
    for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
    const [newBooking] = await db
      .insert(bookings)
      .values({ ...booking, bookingRef: ref } as any)
      .returning();
    return newBooking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.userId, userId));
  }

  async findRecentUnpaidBooking(userId: number, serviceId: number): Promise<Booking | undefined> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [booking] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          eq(bookings.serviceId, serviceId),
          eq(bookings.isPaid, false),
          eq(bookings.status, 'pending'),
          gt(bookings.timestamp, cutoff)
        )
      )
      .orderBy(desc(bookings.id))
      .limit(1);
    return booking || undefined;
  }

  async getActiveBookings(providerId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          inArray(bookings.status, ['assigned', 'confirmed', 'in_progress'])
        )
      );
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async updateBookingStatus(id: number, status: string, stage?: string): Promise<Booking> {
    const updates: any = { status };
    if (stage) updates.currentStage = stage;
    
    const [booking] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async getPricingConfig(): Promise<PricingConfig> {
    const [config] = await db.select().from(pricingConfig).orderBy(desc(pricingConfig.id)).limit(1);
    if (!config) {
      const [newConfig] = await db
        .insert(pricingConfig)
        .values({ basic: 39, interior: 89, standard: 149, premium: 299, updatedAt: new Date().toISOString() })
        .returning();
      return newConfig;
    }
    if (config.interior == null) {
      // Backfill interior on existing row rather than inserting a duplicate
      const [updated] = await db
        .update(pricingConfig)
        .set({ interior: 89, updatedAt: new Date().toISOString() })
        .where(eq(pricingConfig.id, config.id))
        .returning();
      return updated;
    }
    return config;
  }

  async updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig> {
    const [updatedConfig] = await db
      .insert(pricingConfig)
      .values(config)
      .returning();
    // Sync service prices so customers see the updated prices immediately
    const categoryPriceMap: Record<string, number> = {
      basic: config.basic,
      interior: config.interior,
      standard: config.standard,
      premium: config.premium,
    };
    for (const [category, price] of Object.entries(categoryPriceMap)) {
      await db
        .update(services)
        .set({ price })
        .where(eq(services.category, category));
    }
    return updatedConfig;
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(asc(services.id));
  }

  async getServiceById(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db
      .insert(services)
      .values(service)
      .returning();
    return newService;
  }

  async getTimeSlots(): Promise<TimeSlot[]> {
    return await db.select().from(timeSlots);
  }

  async getTimeSlotById(id: number): Promise<TimeSlot | undefined> {
    const [timeSlot] = await db.select().from(timeSlots).where(eq(timeSlots.id, id));
    return timeSlot || undefined;
  }

  async getAvailableTimeSlots(date?: string): Promise<TimeSlot[]> {
    if (date) {
      // Check if time slots exist for this date
      const existingSlots = await db.select().from(timeSlots).where(eq(timeSlots.date, date));
      
      // If no slots exist for this date, create them
      if (existingSlots.length === 0) {
        await this.generateTimeSlotsForDate(date);
      }
      
      return await db.select().from(timeSlots).where(
        and(
          eq(timeSlots.isAvailable, true),
          eq(timeSlots.date, date)
        )
      );
    }
    
    return await db.select().from(timeSlots).where(eq(timeSlots.isAvailable, true));
  }

  private async generateTimeSlotsForDate(dateString: string): Promise<void> {
    // Generate time slots from 8 AM to 4 PM for the given date
    for (let hour = 8; hour <= 15; hour++) {
      const startHour = hour.toString().padStart(2, '0');
      const endHour = (hour + 1).toString().padStart(2, '0');
      
      await this.createTimeSlot({
        date: dateString,
        startTime: `${startHour}:00`,
        endTime: `${endHour}:00`,
        isAvailable: true,
        maxBookings: 3,
        currentBookings: 0
      });
    }
  }

  async createTimeSlot(timeSlot: InsertTimeSlot): Promise<TimeSlot> {
    const [newTimeSlot] = await db
      .insert(timeSlots)
      .values(timeSlot)
      .returning();
    return newTimeSlot;
  }

  async updateTimeSlot(id: number, updates: Partial<TimeSlot>): Promise<TimeSlot> {
    const [timeSlot] = await db
      .update(timeSlots)
      .set(updates)
      .where(eq(timeSlots.id, id))
      .returning();
    return timeSlot;
  }

  async getUserVehicles(userId: number): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.userId, userId));
  }

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db
      .insert(vehicles)
      .values(vehicle)
      .returning();
    return newVehicle;
  }

  async updateVehicle(id: number, updates: Partial<Vehicle>): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set(updates)
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getSavedAddresses(userId: number): Promise<SavedAddress[]> {
    return await db.select().from(savedAddresses).where(eq(savedAddresses.userId, userId));
  }

  async createSavedAddress(data: { userId: number; label: string; address: string; isDefault: boolean }): Promise<SavedAddress> {
    if (data.isDefault) {
      await db.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.userId, data.userId));
    }
    const [addr] = await db.insert(savedAddresses).values(data).returning();
    return addr;
  }

  async updateSavedAddress(id: number, updates: Partial<Pick<SavedAddress, 'label' | 'address' | 'isDefault'>>): Promise<SavedAddress> {
    if (updates.isDefault) {
      const [existing] = await db.select().from(savedAddresses).where(eq(savedAddresses.id, id));
      if (existing) {
        await db.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.userId, existing.userId));
      }
    }
    const [addr] = await db.update(savedAddresses).set(updates).where(eq(savedAddresses.id, id)).returning();
    return addr;
  }

  async deleteSavedAddress(id: number): Promise<boolean> {
    const result = await db.delete(savedAddresses).where(eq(savedAddresses.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getNearbyProviders(latitude: number, longitude: number, radius: number): Promise<User[]> {
    // Using a simple distance calculation for PostgreSQL
    // For production, consider using PostGIS for more accurate geospatial queries
    const providers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isProvider, true),
          eq(users.currentStatus, 'online')
        )
      );

    return providers.filter(provider => {
      if (!provider.latitude || !provider.longitude) return false;
      const distance = this.calculateDistance(latitude, longitude, provider.latitude, provider.longitude);
      return distance <= radius;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Radius of the earth in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in miles
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async assignBookingToProvider(bookingId: number, providerId: number): Promise<Booking> {
    // Atomic update: only succeeds if the booking is still pending and unassigned
    const [booking] = await db
      .update(bookings)
      .set({
        providerId,
        status: 'assigned',
        assignedAt: new Date().toISOString(),
        assignmentExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        trackingEnabled: true
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.status, 'pending'),
          isNull(bookings.providerId)
        )
      )
      .returning();
    if (!booking) {
      throw new Error('Job is no longer available');
    }
    return booking;
  }

  async acceptBooking(bookingId: number, providerId: number): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({
        status: 'confirmed',
        acceptedAt: new Date().toISOString()
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.providerId, providerId)
        )
      )
      .returning();
    return booking;
  }

  async rejectBooking(bookingId: number, providerId: number): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({
        providerId: null,
        status: 'pending',
        rejectedAt: new Date().toISOString(),
        previousProviders: sql`array_append(coalesce(previous_providers, '[]'::jsonb), ${providerId}::jsonb)`
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.providerId, providerId)
        )
      )
      .returning();
    return booking;
  }

  async findBookingAssignment(providerId: number): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          eq(bookings.status, 'assigned')
        )
      )
      .limit(1);
    return booking || undefined;
  }

  async getBookingsByTimeframe(providerId: number, timeframe: 'day' | 'week' | 'month'): Promise<Booking[]> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          gte(bookings.timestamp, startDate.toISOString())
        )
      );
  }

  async getUnassignedBookings(): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'pending'),
          isNull(bookings.providerId)
        )
      );
  }

  async getProviderEarnings(providerId: number, period: string = 'month'): Promise<{
    totalEarnings: number;
    completedServices: number;
    averageRating: number;
    serviceTypeBreakdown: { [key: string]: number };
  }> {
    const completedBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          eq(bookings.status, 'completed')
        )
      );

    const totalEarnings = completedBookings.reduce((sum, booking) => sum + (booking.providerEarnings || 0), 0);
    const completedServices = completedBookings.length;
    const ratingsSum = completedBookings.reduce((sum, booking) => sum + (booking.rating || 0), 0);
    const averageRating = completedServices > 0 ? ratingsSum / completedServices : 0;

    const serviceTypeBreakdown: { [key: string]: number } = {};
    completedBookings.forEach(booking => {
      const tier = booking.priceTier;
      serviceTypeBreakdown[tier] = (serviceTypeBreakdown[tier] || 0) + 1;
    });

    return {
      totalEarnings,
      completedServices,
      averageRating,
      serviceTypeBreakdown
    };
  }

  async getProviderServiceMetrics(providerId: number): Promise<{
    averageDuration: { [key: string]: number };
    totalServiceTime: number;
  }> {
    const completedBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          eq(bookings.status, 'completed')
        )
      );

    const averageDuration: { [key: string]: number } = {};
    const totalServiceTime = completedBookings.reduce((sum, booking) => sum + (booking.serviceDuration || 0), 0);

    const tierDurations: { [key: string]: number[] } = {};
    completedBookings.forEach(booking => {
      const tier = booking.priceTier;
      const duration = booking.serviceDuration || 0;
      if (!tierDurations[tier]) tierDurations[tier] = [];
      tierDurations[tier].push(duration);
    });

    Object.keys(tierDurations).forEach(tier => {
      const durations = tierDurations[tier];
      averageDuration[tier] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    });

    return { averageDuration, totalServiceTime };
  }

  async getRevenueByLocation(): Promise<{
    totalRevenue: number;
    locationData: {
      latitude: number;
      longitude: number;
      location: string;
      revenue: number;
      bookingsCount: number;
    }[];
  }> {
    const completedBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.status, 'completed'));

    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    
    const locationMap = new Map();
    completedBookings.forEach(booking => {
      if (booking.serviceLatitude && booking.serviceLongitude) {
        const key = `${booking.serviceLatitude},${booking.serviceLongitude}`;
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            latitude: booking.serviceLatitude,
            longitude: booking.serviceLongitude,
            location: booking.serviceLocation,
            revenue: 0,
            bookingsCount: 0
          });
        }
        const location = locationMap.get(key);
        location.revenue += booking.totalPrice || 0;
        location.bookingsCount += 1;
      }
    });

    return {
      totalRevenue,
      locationData: Array.from(locationMap.values())
    };
  }

  async getProviderStatusSummary(): Promise<{
    totalProviders: number;
    onlineProviders: number;
    onlineProvidersList: { id: number; name: string; username: string; latitude?: number; longitude?: number; lastLocationUpdate?: string; }[];
    allProviders: { id: number; name: string; username: string; status: string; latitude?: number; longitude?: number; lastLocationUpdate?: string; }[];
  }> {
    const allProviders = await db
      .select()
      .from(users)
      .where(eq(users.isProvider, true));

    const onlineProviders = allProviders.filter(p => p.currentStatus === 'online');

    return {
      totalProviders: allProviders.length,
      onlineProviders: onlineProviders.length,
      onlineProvidersList: onlineProviders.map(p => ({
        id: p.id,
        name: p.name || '',
        username: p.username,
        latitude: p.latitude || undefined,
        longitude: p.longitude || undefined,
        lastLocationUpdate: p.lastLocationUpdate || undefined
      })),
      allProviders: allProviders.map(p => ({
        id: p.id,
        name: p.name || p.username,
        username: p.username,
        status: p.currentStatus || 'offline',
        latitude: p.latitude || undefined,
        longitude: p.longitude || undefined,
        lastLocationUpdate: p.lastLocationUpdate || undefined
      }))
    };
  }

  async startServiceTimer(bookingId: number): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({
        status: 'in_progress',
        startTime: new Date().toISOString()
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async completeServiceTimer(bookingId: number): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking || !booking.startTime) {
      throw new Error('Booking not found or service not started');
    }

    const startTime = new Date(booking.startTime);
    const endTime = new Date();
    const serviceDuration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'completed',
        endTime: endTime.toISOString(),
        serviceDuration
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updatedBooking;
  }

  async addBookingRating(bookingId: number, rating: number, comment?: string): Promise<Booking> {
    // Fetch existing booking to check for a prior rating (for idempotent aggregation)
    const [existing] = await db
      .select({ providerId: bookings.providerId, rating: bookings.rating })
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        rating,
        ratingComment: comment
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Update provider's running average rating (idempotent: handle re-rating)
    if (existing?.providerId) {
      const [provider] = await db
        .select({ rating: users.rating, ratingCount: users.ratingCount })
        .from(users)
        .where(eq(users.id, existing.providerId));
      if (provider) {
        const currentCount = provider.ratingCount || 0;
        const currentAvg = provider.rating || 5;

        let newCount: number;
        let newAvg: number;

        if (existing.rating !== null && existing.rating !== undefined) {
          // Booking already rated — replace old rating in the running average
          if (currentCount <= 1) {
            newCount = 1;
            newAvg = rating;
          } else {
            newCount = currentCount;
            newAvg = ((currentAvg * currentCount) - existing.rating + rating) / currentCount;
          }
        } else {
          // New rating — increment count
          newCount = currentCount + 1;
          newAvg = ((currentAvg * currentCount) + rating) / newCount;
        }

        await db
          .update(users)
          .set({ rating: newAvg, ratingCount: newCount })
          .where(eq(users.id, existing.providerId));
      }
    }

    return updatedBooking;
  }

  async updateBookingTip(bookingId: number, tipAmount: number): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({ tipAmount, pendingTipSessionId: null, pendingTipCents: null })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async updatePendingTipReference(bookingId: number, sessionId: string, tipCents: number): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({ pendingTipSessionId: sessionId, pendingTipCents: tipCents })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async updateBookingPaymentInfo(
    bookingId: number,
    paymentInfo: {
      paymentStatus?: string;
      paymentId?: string;
      paymentDate?: string;
      paymentUrl?: string;
      stripeSessionId?: string;
      isPaid?: boolean;
      paymentMethod?: string;
    }
  ): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set(paymentInfo)
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async getPendingPaymentBookings(): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        or(
          eq(bookings.isPaid, false),
          eq(bookings.paymentStatus, 'pending')
        )
      );
  }

  async generateRebookingSuggestions(
    userId: number,
    userBookings: Booking[],
    services: Service[],
    timeSlots: TimeSlot[]
  ): Promise<any[]> {
    // This is a simplified implementation for the database version
    // In a real implementation, you might want to use more sophisticated algorithms
    const completedBookings = userBookings.filter(b => b.status === 'completed');
    
    if (completedBookings.length === 0) {
      return [];
    }

    const lastBooking = completedBookings[completedBookings.length - 1];
    const preferredService = services.find(s => s.id === lastBooking.serviceId);
    const availableSlots = timeSlots.filter(t => t.isAvailable);

    return [{
      type: 'repeat_service',
      service: preferredService,
      suggestedTimeSlots: availableSlots.slice(0, 3),
      reason: 'Based on your last booking',
      confidence: 0.8
    }];
  }

  // GPS Tracking methods
  async updateProviderLocationForBooking(
    bookingId: number, 
    latitude: number, 
    longitude: number
  ): Promise<Booking> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new Error("Booking not found");

    // Calculate distance to customer if customer location exists
    let distance = null;
    let eta = null;
    
    if (booking.serviceLatitude && booking.serviceLongitude) {
      distance = this.calculateDistance(
        latitude, 
        longitude, 
        booking.serviceLatitude, 
        booking.serviceLongitude
      );
      
      // Simple ETA calculation: distance / average speed (20 mph) * 60 minutes
      const estimatedMinutes = Math.round((distance / 20) * 60);
      eta = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();
    }

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        providerLatitude: latitude,
        providerLongitude: longitude,
        lastLocationUpdate: new Date().toISOString(),
        distanceToCustomer: distance,
        estimatedArrival: eta
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updatedBooking;
  }

  async getActiveTrackingBookings(userId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, userId),
          or(
            eq(bookings.status, 'assigned'),
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'in_progress')
          )
        )
      );
  }

  async calculateETA(
    providerLat: number, 
    providerLng: number, 
    customerLat: number, 
    customerLng: number
  ): Promise<{ eta: string; distance: number }> {
    const distance = this.calculateDistance(providerLat, providerLng, customerLat, customerLng);
    const estimatedMinutes = Math.round((distance / 20) * 60); // 20 mph average speed
    const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();
    
    return { eta, distance };
  }

  async enableTrackingForBooking(bookingId: number): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ trackingEnabled: true })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updatedBooking;
  }

  async getTrackingInfo(bookingId: number): Promise<{
    providerLocation: { lat: number; lng: number } | null;
    customerLocation: { lat: number; lng: number } | null;
    eta: string | null;
    distance: number | null;
    lastUpdate: string | null;
  } | null> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    
    if (!booking || !booking.trackingEnabled) return null;

    return {
      providerLocation: booking.providerLatitude && booking.providerLongitude 
        ? { lat: booking.providerLatitude, lng: booking.providerLongitude }
        : null,
      customerLocation: booking.serviceLatitude && booking.serviceLongitude
        ? { lat: booking.serviceLatitude, lng: booking.serviceLongitude }
        : null,
      eta: booking.estimatedArrival,
      distance: booking.distanceToCustomer,
      lastUpdate: booking.lastLocationUpdate
    };
  }

  async markArrived(bookingId: number, baseDurationMinutes: number): Promise<Booking> {
    const arrivalTime = new Date().toISOString();
    const estimatedCompletionTime = new Date(Date.now() + baseDurationMinutes * 60 * 1000).toISOString();
    const [booking] = await db
      .update(bookings)
      .set({
        arrivalTime,
        estimatedCompletionTime,
        extraTimeMinutes: 0,
        timeAdjustments: [],
        status: 'in_progress',
        startTime: arrivalTime,
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  async updateTimeAdjustments(bookingId: number, adjustments: any[], providerNotes?: string): Promise<Booking> {
    const [existing] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!existing || !existing.arrivalTime) throw new Error('Booking not found or not yet arrived');

    const extraTimeMinutes = adjustments
      .filter((a) => a.selected)
      .reduce((sum: number, a: any) => sum + a.minutes, 0);

    const estimatedCompletionTime = new Date(
      new Date(existing.arrivalTime).getTime() +
      ((existing.serviceDuration || 60) + extraTimeMinutes) * 60 * 1000
    ).toISOString();

    const updates: any = { timeAdjustments: adjustments, extraTimeMinutes, estimatedCompletionTime };
    if (providerNotes !== undefined) updates.providerNotes = providerNotes;

    const [booking] = await db.update(bookings).set(updates).where(eq(bookings.id, bookingId)).returning();
    return booking;
  }

  async getClerkStripeMapping(clerkUserId: string): Promise<ClerkStripeMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(clerkStripeMapping)
      .where(eq(clerkStripeMapping.clerkUserId, clerkUserId));
    return mapping || undefined;
  }

  async createClerkStripeMapping(mapping: InsertClerkStripeMapping): Promise<ClerkStripeMapping> {
    const [newMapping] = await db
      .insert(clerkStripeMapping)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async upsertClerkStripeMapping(clerkUserId: string, stripeCustomerId: string): Promise<void> {
    await db
      .insert(clerkStripeMapping)
      .values({ clerkUserId, stripeCustomerId, createdAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: clerkStripeMapping.clerkUserId,
        set: { stripeCustomerId },
      });
  }

  async addBookingPhoto(bookingId: number, photoType: string, dataUrl: string, caption?: string): Promise<BookingPhoto> {
    const [photo] = await db
      .insert(bookingPhotos)
      .values({ bookingId, photoType, dataUrl, caption: caption ?? null, uploadedAt: new Date().toISOString() })
      .returning();
    return photo;
  }

  async getBookingPhotos(bookingId: number): Promise<BookingPhoto[]> {
    return db.select().from(bookingPhotos).where(eq(bookingPhotos.bookingId, bookingId));
  }

  async deleteBookingPhoto(photoId: number): Promise<void> {
    await db.delete(bookingPhotos).where(eq(bookingPhotos.id, photoId));
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(message).returning();
    return created;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.id));
  }

  async resolveContactMessage(id: number): Promise<ContactMessage> {
    const [updated] = await db
      .update(contactMessages)
      .set({ resolved: true, resolvedAt: new Date().toISOString() })
      .where(eq(contactMessages.id, id))
      .returning();
    if (!updated) throw new Error("Contact message not found");
    return updated;
  }

  async reopenContactMessage(id: number): Promise<ContactMessage> {
    const [updated] = await db
      .update(contactMessages)
      .set({ resolved: false, resolvedAt: null })
      .where(eq(contactMessages.id, id))
      .returning();
    if (!updated) throw new Error("Contact message not found");
    return updated;
  }

  async initialize(): Promise<void> {
    // Seed default admin user if not present
    const existing = await this.getUserByUsername("dapperadmin");
    if (!existing) {
      const hashed = await hashPassword("admin123");
      await db.insert(users).values({
        username: "dapperadmin",
        password: hashed,
        isAdmin: true,
        isProvider: false,
        name: "Dapr Admin",
      });
      console.log("[storage] Default admin user created (dapperadmin)");
    }

    // Sync the four customer-facing service tiers. We match by category so
    // legacy rows (Basic / The OG / Black Label) get their name, price, and
    // duration rewritten in place — preserving the existing `services.id`
    // values that historical bookings reference. The new "interior" tier is
    // inserted on first run. Any duplicate rows in the same category are
    // collapsed: their bookings are repointed at the primary row before the
    // duplicate is removed, so we end up with exactly one row per tier.
    for (const tier of TIER_SEEDS) {
      const matches = await db
        .select()
        .from(services)
        .where(eq(services.category, tier.category))
        .orderBy(asc(services.id));
      if (matches.length === 0) {
        await db.insert(services).values(tier);
        console.log(`[storage] Seeded service tier: ${tier.name}`);
        continue;
      }

      const [primary, ...duplicates] = matches;
      if (
        primary.name !== tier.name ||
        primary.description !== tier.description ||
        primary.price !== tier.price ||
        primary.duration !== tier.duration
      ) {
        await db.update(services).set(tier).where(eq(services.id, primary.id));
        console.log(`[storage] Updated service tier ${primary.id} → ${tier.name}`);
      }

      for (const dup of duplicates) {
        await db
          .update(bookings)
          .set({ serviceId: primary.id })
          .where(eq(bookings.serviceId, dup.id));
        await db.delete(services).where(eq(services.id, dup.id));
        console.log(
          `[storage] Removed duplicate service tier ${dup.id} (${dup.name}); bookings repointed to ${primary.id}`,
        );
      }
    }
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code.toUpperCase()));
    return user;
  }

  async applyReferralCode(newUserId: number, code: string): Promise<{ success: boolean; message: string }> {
    const newUser = await db.select().from(users).where(eq(users.id, newUserId)).then(r => r[0]);
    if (!newUser) return { success: false, message: 'User not found.' };
    if (newUser.referredByCode) return { success: false, message: 'You have already applied a referral code.' };

    const referrer = await this.getUserByReferralCode(code);
    if (!referrer) return { success: false, message: 'Referral code not found.' };
    if (referrer.id === newUserId) return { success: false, message: 'You cannot use your own referral code.' };

    await db.update(users).set({ referredByCode: code.toUpperCase(), freeWashCredits: (newUser.freeWashCredits ?? 0) + 1 }).where(eq(users.id, newUserId));
    await db.insert(referrals).values({ referrerId: referrer.id, referredUserId: newUserId, referrerCredited: false, createdAt: new Date().toISOString() });

    return { success: true, message: '1 free wash credit added to your account!' };
  }

  async getReferralInfo(userId: number): Promise<{ code: string; credits: number; referralCount: number; pendingCredits: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { code: '', credits: 0, referralCount: 0, pendingCredits: 0 };

    const allReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
    const credited = allReferrals.filter(r => r.referrerCredited).length;
    const pending = allReferrals.filter(r => !r.referrerCredited).length;

    return {
      code: user.referralCode ?? '',
      credits: user.freeWashCredits ?? 0,
      referralCount: credited,
      pendingCredits: pending,
    };
  }

  async consumeFreeWashCredit(userId: number): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || (user.freeWashCredits ?? 0) < 1) return false;
    await db.update(users).set({ freeWashCredits: (user.freeWashCredits ?? 1) - 1 }).where(eq(users.id, userId));
    return true;
  }

  async creditReferrerForCompletedBooking(referredUserId: number): Promise<void> {
    const [referral] = await db.select().from(referrals).where(
      and(eq(referrals.referredUserId, referredUserId), eq(referrals.referrerCredited, false))
    );
    if (!referral) return;

    const [referrer] = await db.select().from(users).where(eq(users.id, referral.referrerId));
    if (!referrer) return;

    await db.update(users).set({ freeWashCredits: (referrer.freeWashCredits ?? 0) + 1 }).where(eq(users.id, referral.referrerId));
    await db.update(referrals).set({ referrerCredited: true }).where(eq(referrals.id, referral.id));
  }
}

export const storage = new DatabaseStorage();