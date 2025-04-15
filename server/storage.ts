import { User, Booking, InsertUser, PricingConfig, Service, TimeSlot, InsertService, InsertTimeSlot } from "@shared/schema";
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
  getUserBookings(userId: number): Promise<Booking[]>;
  getActiveBookings(providerId: number): Promise<Booking[]>;
  updateProviderLocation(userId: number, latitude: number, longitude: number): Promise<void>;
  updateProviderStatus(userId: number, status: string): Promise<User>;
  getPricingConfig(): Promise<PricingConfig>;
  updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig>;
  // New methods for services and time slots
  getServices(): Promise<Service[]>;
  getServiceById(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
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
  private pricingConfig: PricingConfig;
  sessionStore: session.Store;
  currentUserId: number;
  currentBookingId: number;
  currentServiceId: number;
  currentTimeSlotId: number;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
    this.services = new Map();
    this.timeSlots = new Map();
    this.currentUserId = 1;
    this.currentBookingId = 1;
    this.currentServiceId = 1;
    this.currentTimeSlotId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Set default pricing
    this.pricingConfig = {
      id: 1,
      basic: 30,
      standard: 50,
      premium: 80,
      updatedAt: new Date().toISOString()
    };

    // Create a single car wash company instead of multiple providers
    this.createUser({
      username: "carwashcompany",
      password: "password",
      isProvider: true,
      name: "Super Shine Car Wash",
      description: "Professional car wash service with the best quality and customer satisfaction",
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
      description: "Exterior wash and basic cleaning",
      price: 30,
      duration: 30,
      category: "basic"
    });
    
    this.createService({
      name: "Standard Wash",
      description: "Exterior wash, interior vacuum, and window cleaning",
      price: 50,
      duration: 45,
      category: "standard"
    });
    
    this.createService({
      name: "Premium Wash",
      description: "Full detail, wax treatment, interior deep clean, and tire shine",
      price: 80,
      duration: 60,
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
      rating: booking.rating || null
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
}

export const storage = new MemStorage();