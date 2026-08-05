import type { PushDeliverySummary, PushService } from "./push-service";
import type { PushEnvironment } from "./push-device-repository";

/**
 * Automatic customer push notifications for the booking lifecycle.
 *
 * Rules:
 * - Sent only AFTER the corresponding database mutation succeeded (callers hook
 *   in after the storage call returns).
 * - Sent only to the booking customer's enabled devices with app_type=customer
 *   and the environment of the running backend (never provider devices, never
 *   the legacy users.push_token column — PushService reads push_devices only).
 * - Delivery failures are swallowed and logged; they never fail or roll back
 *   the booking mutation.
 * - Payloads contain only routing data: bookingId, destination, event.
 */

export type BookingLifecycleEvent =
  | "confirmed"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "started"
  | "completed"
  | "cancelled";

type LifecycleMessage = { title: string; body: string; destination: "booking_tracking" | "booking_details" };

export const BOOKING_LIFECYCLE_MESSAGES: Record<BookingLifecycleEvent, LifecycleMessage> = {
  confirmed: { title: "Booking confirmed", body: "Your Dapr service is confirmed.", destination: "booking_details" },
  assigned: { title: "Detailer matched", body: "A Dapr detailer has accepted your booking.", destination: "booking_tracking" },
  on_the_way: { title: "Your detailer is on the way", body: "Your Dapr detailer is heading to you.", destination: "booking_tracking" },
  arrived: { title: "Your detailer has arrived", body: "Your Dapr detailer is ready to begin.", destination: "booking_tracking" },
  started: { title: "Service started", body: "Your vehicle service is now in progress.", destination: "booking_tracking" },
  completed: { title: "Service complete", body: "Your vehicle is ready.", destination: "booking_details" },
  cancelled: { title: "Booking canceled", body: "Your Dapr booking has been canceled.", destination: "booking_details" },
};

/** Maps a lifecycle status transition to the event to notify, or null when the
 *  stored state is unchanged (retry / already-stored status → no notification). */
export function lifecycleEventForStatusChange(previousStatus: string, nextStatus: string): BookingLifecycleEvent | null {
  if (previousStatus === nextStatus) return null;
  switch (nextStatus) {
    case "on_the_way":
      return "on_the_way";
    case "arrived":
      return "arrived";
    case "in_progress":
      return "started";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

export function runningPushEnvironment(): PushEnvironment {
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export type BookingNotifier = (
  event: BookingLifecycleEvent,
  booking: { id: number; userId: number | null },
) => Promise<PushDeliverySummary | null>;

export function createBookingNotifier(
  pushService: Pick<PushService, "sendToUser">,
  environment: PushEnvironment = runningPushEnvironment(),
): BookingNotifier {
  return async function notifyBookingCustomer(event, booking) {
    try {
      if (!booking || typeof booking.id !== "number" || !booking.userId) return null;
      const message = BOOKING_LIFECYCLE_MESSAGES[event];
      if (!message) return null;
      return await pushService.sendToUser({
        userId: booking.userId,
        appType: "customer",
        environment,
        title: message.title,
        body: message.body,
        data: {
          bookingId: String(booking.id),
          destination: message.destination,
          event,
        },
      });
    } catch (error) {
      // Never let notification delivery affect the booking mutation result.
      console.error(`Booking push notification failed (event=${event}, booking=${booking?.id}):`, error);
      return null;
    }
  };
}
