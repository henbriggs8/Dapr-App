import { User, Booking, InsertUser, PricingConfig, Service, TimeSlot, InsertService, InsertTimeSlot, Vehicle, InsertVehicle } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProviders(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createBooking(booking: Omit<Booking, 'id'>): Promise<Booking>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getUserBookings(userId: number): Promise<Booking[]>;
  getActiveBookings(providerId: number): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string, stage?: string): Promise<Booking>;
  updateProviderLocation(userId: number, latitude: number, longitude: number): Promise<void>;
  updateProviderStatus(userId: number, status: string): Promise<User>;
  getPricingConfig(): Promise<PricingConfig>;
  updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig>;
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
  // Booking timing methods
  startServiceTimer(bookingId: number): Promise<Booking>;
  completeServiceTimer(bookingId: number): Promise<Booking>;
  // Rating methods
  addBookingRating(bookingId: number, rating: number, comment?: string): Promise<Booking>;
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
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bookings: Map<number, Booking>;
  private services: Map<number, Service>;
  private timeSlots: Map<number, TimeSlot>;
  private vehicles: Map<number, Vehicle>;
  private pricingConfig: PricingConfig;
  sessionStore: session.Store;
  currentUserId: number;
  currentBookingId: number;
  currentServiceId: number;
  currentTimeSlotId: number;
  currentVehicleId: number;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
    this.services = new Map();
    this.timeSlots = new Map();
    this.vehicles = new Map();
    this.currentUserId = 1;
    this.currentBookingId = 1;
    this.currentServiceId = 1;
    this.currentTimeSlotId = 1;
    this.currentVehicleId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Set default pricing
    this.pricingConfig = {
      id: 1,
      basic: 30,
      standard: 55,
      premium: 175,
      updatedAt: new Date().toISOString()
    };

    // Create a single car wash company instead of multiple providers
    this.createUser({
      username: "carwashcompany",
      password: "password",
      isProvider: true,
      name: "Dapper",
      description: "Premium car wash and detailing services for the discerning vehicle owner",
      latitude: 40.7128,
      longitude: -74.0060,
      profileImage: "https://images.unsplash.com/photo-1556745753-b2904692b3cd",
      currentStatus: "online"
    });

    // Create admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      isAdmin: true,
      name: "System Administrator"
    });
    
    // Create services
    this.createService({
      name: "Basic Wash",
      description: "Exterior wash only - perfect for a quick refresh",
      price: 30,
      duration: 30,
      category: "basic"
    });
    
    this.createService({
      name: "The OG",
      description: "Maintenance clean, hand wash, vacuum and wipe down",
      price: 55,
      duration: 45,
      category: "standard"
    });
    
    this.createService({
      name: "Full Detail",
      description: "Hand wash, wheels degreased & shine, glass shined, spray wax. Interior: vacuum, carpets & mats shampooed, leather & upholstery steam cleaned, cup holders cleaned",
      price: 175,
      duration: 90,
      category: "premium"
    });
    
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
    const user: User = {
      id,
      ...insertUser,
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
      isAdmin: insertUser.isAdmin || false
    };
    this.users.set(id, user);
    return user;
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

  async createBooking(booking: Omit<Booking, 'id'>): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking = {
      ...booking,
      id,
      status: booking.status || 'pending',
      rating: booking.rating || null,
      vehicleId: booking.vehicleId || null,
      notes: booking.notes || null,
      // New fields for earnings and timing tracking
      ratingComment: booking.ratingComment || null,
      amount: booking.amount || null,
      providerEarnings: booking.providerEarnings || null,
      startTime: booking.startTime || null,
      endTime: booking.endTime || null,
      serviceDuration: booking.serviceDuration || null
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }

  async getActiveBookings(providerId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => 
        booking.providerId === providerId && 
        booking.status !== 'completed' &&
        booking.status !== 'cancelled'
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
    
    // Update provider rating
    const provider = await this.getUser(booking.providerId);
    if (provider) {
      const currentRatingCount = provider.ratingCount || 0;
      const currentRating = provider.rating || 5; // Default to 5 if no ratings yet
      const newRatingCount = currentRatingCount + 1;
      const newRating = ((currentRating * currentRatingCount) + rating) / newRatingCount;
      
      this.users.set(provider.id, {
        ...provider,
        rating: newRating,
        ratingCount: newRatingCount
      });
    }
    
    return updatedBooking;
  }

  async getPricingConfig(): Promise<PricingConfig> {
    return this.pricingConfig;
  }

  async updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig> {
    this.pricingConfig = { ...config, id: this.pricingConfig.id };
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
}

export const storage = new MemStorage();