import { getMessaging } from "firebase-admin/messaging";
import { FirebaseConfigurationError, getFirebaseApp } from "./firebase-admin";
import type { PushAppType, PushDeviceRepository, PushEnvironment } from "./push-device-repository";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

export type PushDeliveryInput = {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
  appType?: PushAppType;
  environment?: PushEnvironment;
};

export type PushDeliverySummary = {
  attempted: number;
  delivered: number;
  invalidDisabled: number;
  failed: number;
};

export type PushSender = Pick<ReturnType<typeof getMessaging>, "send">;

export class PushService {
  constructor(
    private readonly devices: PushDeviceRepository,
    private readonly senderFactory: () => PushSender = () => getMessaging(getFirebaseApp()),
  ) {}

  isPushConfigured(): boolean {
    try {
      getFirebaseApp();
      return true;
    } catch (error) {
      if (error instanceof FirebaseConfigurationError) return false;
      throw error;
    }
  }

  async disableInvalidToken(deviceId: number): Promise<void> {
    await this.devices.disableById(deviceId);
  }

  async sendToTokens(tokens: string[], input: Omit<PushDeliveryInput, "userId" | "appType">): Promise<PushDeliverySummary> {
    if (!tokens.length) return { attempted: 0, delivered: 0, invalidDisabled: 0, failed: 0 };
    const sender = this.senderFactory();
    let delivered = 0;
    let invalidDisabled = 0;
    let failed = 0;
    for (const token of tokens) {
      try {
        await sender.send({
          token,
          notification: { title: input.title, body: input.body },
          data: input.data,
        });
        delivered++;
      } catch (error: any) {
        if (INVALID_TOKEN_CODES.has(error?.code)) {
          await this.devices.disableByToken(token);
          invalidDisabled++;
        }
        failed++;
      }
    }
    return { attempted: tokens.length, delivered, invalidDisabled, failed };
  }

  async sendToUser(input: PushDeliveryInput): Promise<PushDeliverySummary> {
    const devices = await this.devices.enabledForUser(input.userId, input.appType, input.environment);
    if (!devices.length) return { attempted: 0, delivered: 0, invalidDisabled: 0, failed: 0 };

    const sender = this.senderFactory();
    let delivered = 0;
    let invalidDisabled = 0;
    let failed = 0;
    for (const device of devices) {
      try {
        await sender.send({
          token: device.fcmToken,
          notification: { title: input.title, body: input.body },
          data: input.data,
        });
        delivered++;
      } catch (error: any) {
        if (INVALID_TOKEN_CODES.has(error?.code)) {
          await this.disableInvalidToken(device.id);
          invalidDisabled++;
        } else {
          failed++;
        }
      }
    }
    return { attempted: devices.length, delivered, invalidDisabled, failed };
  }

  async send(input: PushDeliveryInput): Promise<PushDeliverySummary> {
    return this.sendToUser(input);
  }
}