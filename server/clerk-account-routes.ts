import { randomBytes } from "node:crypto";
import type { Express } from "express";
import type { InsertUser, User } from "@shared/schema";
import { safeUser } from "./auth";

type ClerkProfile = {
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  phoneNumbers: { phoneNumber: string }[];
};

export type ClerkAccountDependencies = {
  verifyToken(token: string): Promise<{ sub: string }>;
  getClerkUser(id: string): Promise<ClerkProfile>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
};

export function registerClerkAccountRoutes(app: Express, deps: ClerkAccountDependencies) {
  // Signup and password recovery belong to Clerk's verified client flows.
  // Keep a deterministic response for stale clients without looking up an identity.
  app.post("/api/auth/clerk/complete-signup", (_req, res) => {
    res.status(410).json({
      code: "CLERK_SIGNUP_REQUIRED",
      error: "Complete sign-up or password recovery through Clerk, then sign in.",
    });
  });

  // /api/register is a compatibility alias, not a second identity system.
  app.post(["/api/auth/clerk-sync", "/api/register"], async (req, res) => {
    const authorization = req.get("authorization");
    let subject: string;
    try {
      if (!authorization?.startsWith("Bearer ")) throw new Error("Missing token");
      const verified = await deps.verifyToken(authorization.slice(7));
      if (!verified.sub) throw new Error("Missing identity");
      subject = verified.sub;
    } catch {
      return res.status(401).json({ code: "UNAUTHENTICATED", error: "Sign in with Clerk first." });
    }

    try {
      const username = `clerk_${subject}`;
      let user = await deps.getUserByUsername(username);
      if (!user) {
        const profile = await deps.getClerkUser(subject);
        const input: InsertUser = {
          username,
          // This required database field is not a usable local login credential.
          password: randomBytes(32).toString("hex"),
          isAdmin: false,
          isProvider: false,
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "User",
          email: profile.emailAddresses[0]?.emailAddress ?? null,
          phone: profile.phoneNumbers[0]?.phoneNumber ?? null,
        };
        try {
          user = await deps.createUser(input);
        } catch (error) {
          // Concurrent first syncs may race the unique username constraint.
          if ((error as { code?: string })?.code !== "23505") throw error;
          user = await deps.getUserByUsername(username);
          if (!user) throw error;
        }
      }
      // Ignore all request-body identity, password and role fields. Existing
      // provider/admin approval is owned by the database and remains unchanged.
      await new Promise<void>((resolve, reject) => {
        req.login(user!, error => error ? reject(error) : resolve());
      });
      return res.json(safeUser(user));
    } catch {
      return res.status(500).json({ error: "Failed to sync Clerk user" });
    }
  });
}
