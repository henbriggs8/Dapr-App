import { User, Booking, InsertUser, PricingConfig } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProviders(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createBooking(booking: Booking): Promise<Booking>;
  getUserBookings(userId: number): Promise<Booking[]>;
  getActiveBookings(providerId: number): Promise<Booking[]>;
  updateProviderLocation(userId: number, latitude: number, longitude: number): Promise<void>;
  getPricingConfig(): Promise<PricingConfig>;
  updatePricingConfig(config: Omit<PricingConfig, "id">): Promise<PricingConfig>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bookings: Map<number, Booking>;
  private pricingConfig: PricingConfig;
  sessionStore: session.Store;
  currentUserId: number;
  currentBookingId: number;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
    this.currentUserId = 1;
    this.currentBookingId = 1;
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

    // Add some sample providers
    this.createUser({
      username: "washer1",
      password: "password",
      isProvider: true,
      name: "Premium Car Wash",
      description: "Professional car wash service with years of experience",
      latitude: 40.7128,
      longitude: -74.0060,
      profileImage: "https://images.unsplash.com/photo-1556745753-b2904692b3cd",
      currentStatus: "online"
    });

    this.createUser({
      username: "washer2",
      password: "password",
      isProvider: true,
      name: "Sparkle & Shine",
      description: "Eco-friendly car wash solutions",
      latitude: 40.7589,
      longitude: -73.9851,
      profileImage: "https://images.unsplash.com/photo-1649105703438-0992d6844823",
      currentStatus: "offline"
    });

    // Create admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      isAdmin: true,
      name: "System Administrator"
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

  async getProviders(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.isProvider);
  }

  async createBooking(booking: Booking): Promise<Booking> {
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
}

export const storage = new MemStorage();