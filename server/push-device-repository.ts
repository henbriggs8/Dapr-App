import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { pushDevices } from "@shared/schema";

export type PushAppType = "customer" | "provider";
export type PushEnvironment = "development" | "production";

export type RegisterPushDeviceInput = {
  userId: number;
  fcmToken: string;
  appType: PushAppType;
  platform: "ios";
  environment: PushEnvironment;
};

export type EnabledPushDevice = {
  id: number;
  fcmToken: string;
  appType: PushAppType;
};

export interface PushDeviceRepository {
  register(input: RegisterPushDeviceInput): Promise<void>;
  disableForUser(userId: number, fcmToken: string): Promise<boolean>;
  enabledForUser(userId: number, appType?: PushAppType, environment?: PushEnvironment): Promise<EnabledPushDevice[]>;
  disableById(id: number): Promise<void>;
  disableByToken(fcmToken: string): Promise<void>;
}

export class DatabasePushDeviceRepository implements PushDeviceRepository {
  async register(input: RegisterPushDeviceInput): Promise<void> {
    const now = new Date();
    await db.insert(pushDevices).values({
      ...input,
      notificationsEnabled: true,
      lastSeenAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: pushDevices.fcmToken,
      set: {
        userId: input.userId,
        appType: input.appType,
        platform: input.platform,
        environment: input.environment,
        notificationsEnabled: true,
        lastSeenAt: now,
        updatedAt: now,
      },
    });
  }

  async disableForUser(userId: number, fcmToken: string): Promise<boolean> {
    const result = await db.update(pushDevices)
      .set({ notificationsEnabled: false, updatedAt: new Date() })
      .where(and(eq(pushDevices.userId, userId), eq(pushDevices.fcmToken, fcmToken), eq(pushDevices.notificationsEnabled, true)))
      .returning({ id: pushDevices.id });
    return result.length > 0;
  }

  async enabledForUser(userId: number, appType?: PushAppType, environment?: PushEnvironment): Promise<EnabledPushDevice[]> {
    const conditions = [eq(pushDevices.userId, userId), eq(pushDevices.notificationsEnabled, true)];
    if (appType) conditions.push(eq(pushDevices.appType, appType));
    if (environment) conditions.push(eq(pushDevices.environment, environment));
    return db.select({
      id: pushDevices.id,
      fcmToken: pushDevices.fcmToken,
      appType: pushDevices.appType,
    }).from(pushDevices).where(and(...conditions)) as Promise<EnabledPushDevice[]>;
  }

  async disableById(id: number): Promise<void> {
    await db.update(pushDevices).set({ notificationsEnabled: false, updatedAt: new Date() }).where(eq(pushDevices.id, id));
  }

  async disableByToken(fcmToken: string): Promise<void> {
    await db.update(pushDevices)
      .set({ notificationsEnabled: false, updatedAt: new Date() })
      .where(eq(pushDevices.fcmToken, fcmToken));
  }
}