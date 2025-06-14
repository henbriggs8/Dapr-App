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
    onlineProvidersList: {
      id: number;
      name: string;
      username: string;
      latitude?: number;
      longitude?: number;
      lastLocationUpdate?: string;
    }[];
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
  
  // Payment methods
  updateBookingPaymentInfo(
    bookingId: number, 
    paymentInfo: {
      paymentStatus?: string;
      paymentId?: string;
      paymentDate?: string;
      paymentUrl?: string;
      squareOrderId?: string;
      isPaid?: boolean;
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
    
    // Create services with centralized pricing
    this.createService({
      name: "Basic",
      description: "Exterior hand wash, Streak free windows",
      price: 39,
      duration: 30,
      category: "basic"
    });
    
    this.createService({
      name: "The OG",
      description: "Hand wash, Tires degreased, Vacuum and interior wipe down",
      price: 58,
      duration: 45,
      category: "standard"
    });
    
    this.createService({
      name: "Black Label",
      description: "Everything in O.G. plus premium services including carpet shampoo and steam extraction",
      price: 167,
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
      squareOrderId: null,
    });
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
    const newBooking: Booking = {
      id,
      userId: booking.userId,
      providerId: booking.providerId || null,
      serviceId: booking.serviceId,
      timeSlotId: booking.timeSlotId,
      vehicleId: booking.vehicleId || null,
      status: booking.status || 'pending',
      currentStage: booking.currentStage || null,
      rating: booking.rating || null,
      ratingComment: booking.ratingComment || null,
      priceTier: booking.priceTier,
      timestamp: booking.timestamp,
      serviceLocation: booking.serviceLocation,
      serviceLocationType: booking.serviceLocationType,
      serviceLatitude: booking.serviceLatitude || null,
      serviceLongitude: booking.serviceLongitude || null,
      notes: booking.notes || null,
      date: booking.date || null,
      time: booking.time || null,
      amount: booking.amount || null,
      providerEarnings: booking.providerEarnings || null,
      startTime: booking.startTime || null,
      endTime: booking.endTime || null,
      serviceDuration: booking.serviceDuration || null,
      assignedAt: booking.assignedAt || null,
      acceptedAt: booking.acceptedAt || null,
      rejectedAt: booking.rejectedAt || null,
      assignmentExpiry: booking.assignmentExpiry || null,
      previousProviders: booking.previousProviders || [],
      addOns: booking.addOns || [],
      addOnTotal: booking.addOnTotal || null,
      totalPrice: booking.totalPrice || null,
      isPaid: booking.isPaid || false,
      paymentStatus: booking.paymentStatus || 'pending',
      paymentId: booking.paymentId || null,
      paymentDate: booking.paymentDate || null,
      paymentUrl: booking.paymentUrl || null,
      squareOrderId: booking.squareOrderId || null,
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
    onlineProvidersList: {
      id: number;
      name: string;
      username: string;
      latitude?: number;
      longitude?: number;
      lastLocationUpdate?: string;
    }[];
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
      onlineProvidersList
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
    if (booking.providerId !== null) {
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
    
    const provider = await this.getUser(providerId);
    if (!provider || !provider.isProvider) {
      throw new Error('Provider not found');
    }
    
    const now = new Date();
    // Set expiry time for assignment (5 minutes from now)
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
      squareOrderId?: string;
      isPaid?: boolean;
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
      squareOrderId: paymentInfo.squareOrderId || booking.squareOrderId || null,
      isPaid: paymentInfo.isPaid !== undefined ? paymentInfo.isPaid : booking.isPaid || false
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
}

export const storage = new MemStorage();