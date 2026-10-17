import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { IStorage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { clerkClient } from "@clerk/clerk-sdk-node";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function safeUser(user: SelectUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    birthday: user.birthday,
    description: user.description,
    profileImage: user.profileImage,
    rating: user.rating,
    ratingCount: user.ratingCount,
    isProvider: user.isProvider,
    isAdmin: user.isAdmin,
    currentStatus: user.currentStatus,
    referralCode: user.referralCode,
    freeWashCredits: user.freeWashCredits,
    referralCreditBalanceCents: user.referralCreditBalanceCents,
  };
}

export function setupAuth(
  app: Express,
  storage: Pick<IStorage, "sessionStore" | "getUser" | "getUserByUsername">,
  verifyToken: (token: string) => Promise<{ sub: string }> = token => clerkClient.verifyToken(token),
) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET env var is not set"); })(),
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  const sessionMiddleware = session(sessionSettings);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const normalizedUsername = username.trim().toLowerCase();
      // Clerk identities can only authenticate through Clerk, never a local password.
      if (normalizedUsername.startsWith("clerk_")) return done(null, false);
      const user = await storage.getUserByUsername(normalizedUsername);
      if (!user || !user.password || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(safeUser(req.user!));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    // Passport session auth (providers/admins)
    if (req.isAuthenticated()) {
      return res.json(safeUser(req.user!));
    }

    // Clerk bearer token auth (customers)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const verified = await verifyToken(token);
        if (verified?.sub) {
          const clerkUsername = `clerk_${verified.sub}`;
          const user = await storage.getUserByUsername(clerkUsername);
          if (user) return res.json(safeUser(user));
        }
      } catch {
        // fall through to 401
      }
    }

    return res.sendStatus(401);
  });
  return sessionMiddleware;
}
