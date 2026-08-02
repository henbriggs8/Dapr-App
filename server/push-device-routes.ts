import type { Express, Request, Response } from "express";
import { z } from "zod";
import { resolveUserFromBearer } from "./clerk-middleware";
import type { PushDeviceRepository } from "./push-device-repository";
import { PushService } from "./push-service";

const fcmToken = z.string().trim().min(20).max(4096).regex(/^[A-Za-z0-9_:.~-]+$/, "Invalid FCM token.");
const registerSchema = z.object({
  fcmToken,
  appType: z.enum(["customer", "provider"]),
  platform: z.literal("ios"),
  environment: z.enum(["development", "production"]),
}).strict();
const disableSchema = z.object({ fcmToken }).strict();
const legacyRegisterSchema = z.object({
  token: fcmToken,
  platform: z.literal("ios").optional(),
}).strict();
const testSchema = z.object({
  fcmToken,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  data: z.record(z.string().max(100), z.string().max(500)).optional(),
}).strict();

function authenticatedUser(req: Request, res: Response): { id: number; isAdmin?: boolean } | undefined {
  if (!req.user) {
    res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    return;
  }
  return req.user;
}

function invalidRequest(res: Response) {
  return res.status(400).json({ code: "INVALID_REQUEST", error: "Request validation failed." });
}

export function registerPushDeviceRoutes(app: Express, devices: PushDeviceRepository, pushService: PushService) {
  app.post("/api/push-devices/register", resolveUserFromBearer, async (req, res) => {
    const user = authenticatedUser(req, res);
    if (!user) return;
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return invalidRequest(res);
    await devices.register({ userId: user.id, ...parsed.data });
    res.status(200).json({ success: true });
  });

  // Compatibility adapter for existing Capacitor/native clients. It writes only
  // to the multi-device store and can be removed after all clients switch.
  app.post("/api/user/push-token", resolveUserFromBearer, async (req, res) => {
    const user = authenticatedUser(req, res);
    if (!user) return;
    const parsed = legacyRegisterSchema.safeParse(req.body);
    if (!parsed.success) return invalidRequest(res);
    await devices.register({
      userId: user.id,
      fcmToken: parsed.data.token,
      appType: user.isProvider ? "provider" : "customer",
      platform: "ios",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
    });
    res.status(200).json({ success: true });
  });

  app.delete("/api/push-devices/current", resolveUserFromBearer, async (req, res) => {
    const user = authenticatedUser(req, res);
    if (!user) return;
    const parsed = disableSchema.safeParse(req.body);
    if (!parsed.success) return invalidRequest(res);
    await devices.disableForUser(user.id, parsed.data.fcmToken);
    res.status(200).json({ success: true });
  });

  app.post("/api/admin/push/test", resolveUserFromBearer, async (req, res) => {
    const user = authenticatedUser(req, res);
    if (!user) return;
    if (!user.isAdmin) return res.status(403).json({ code: "ADMIN_REQUIRED", error: "Admin access required." });
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) return invalidRequest(res);
    try {
      const result = await pushService.sendToTokens([parsed.data.fcmToken], parsed.data);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("[push] admin test delivery failed:", error instanceof Error ? error.name : "unknown");
      res.status(503).json({ code: "PUSH_UNAVAILABLE", error: "Push delivery is not configured or currently unavailable." });
    }
  });
}