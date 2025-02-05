import { User, Booking, InsertUser, insertUserSchema } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProviders(): Promise<User[]>;
  createBooking(booking: Booking): Promise<Booking>;
  getUserBookings(userId: number): Promise<Booking[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bookings: Map<number, Booking>;
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
      priceBasic: 30,
      priceStandard: 50,
      pricePremium: 80
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
      priceBasic: 25,
      priceStandard: 45,
      pricePremium: 75
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { id, ...insertUser, rating: 5, ratingCount: 0 };
    this.users.set(id, user);
    return user;
  }

  async getProviders(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.isProvider);
  }

  async createBooking(booking: Booking): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking = { ...booking, id };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getUserBookings(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.userId === userId
    );
  }
}

export const storage = new MemStorage();
