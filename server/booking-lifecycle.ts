import type { Booking } from "@shared/schema";

export type BookingLifecycleAction =
  | "on_the_way"
  | "arrived"
  | "start"
  | "complete";

export type BookingLifecycleActor = {
  type: "provider" | "admin";
  id: number;
};

export class BookingLifecycleError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function canUseAdminLifecycle(actor?: { isAdmin?: boolean } | null): boolean {
  return actor?.isAdmin === true;
}

export function nextAdminLifecycleAction(status: string): BookingLifecycleAction | null {
  switch (status) {
    case "assigned":
    case "confirmed":
      return "on_the_way";
    case "on_the_way":
      return "arrived";
    case "arrived":
      return "start";
    case "in_progress":
      return "complete";
    default:
      return null;
  }
}

export interface BookingLifecycleDependencies {
  markOnTheWay(bookingId: number): Promise<Booking>;
  markArrived(bookingId: number, baseDurationMinutes: number): Promise<Booking>;
  startServiceTimer(bookingId: number): Promise<Booking>;
  completeServiceTimer(bookingId: number): Promise<Booking>;
  notifyCustomer(
    event: "on_the_way" | "arrived" | "started" | "completed",
    booking: Booking,
  ): Promise<void> | void;
  publishUpdate(action: BookingLifecycleAction, booking: Booking): Promise<void> | void;
  afterCompletion?(booking: Booking): Promise<void> | void;
  audit?(entry: {
    bookingId: number;
    previousStatus: string;
    newStatus: string;
    actorType: BookingLifecycleActor["type"];
    actorId: number;
    timestamp: string;
  }): Promise<void> | void;
}

export interface BookingLifecycleInput {
  booking: Booking;
  action: BookingLifecycleAction;
  actor: BookingLifecycleActor;
  baseDurationMinutes?: number;
  allowProviderArrivalShortcut?: boolean;
}

const targetStatus: Record<BookingLifecycleAction, string> = {
  on_the_way: "on_the_way",
  arrived: "arrived",
  start: "in_progress",
  complete: "completed",
};

function isIdempotentRetry(booking: Booking, action: BookingLifecycleAction): boolean {
  switch (action) {
    case "on_the_way":
      return booking.status === "on_the_way";
    case "arrived":
      return booking.status === "arrived" && Boolean(booking.arrivalTime);
    case "start":
      return booking.status === "in_progress" && Boolean(booking.startTime);
    case "complete":
      return booking.status === "completed" && Boolean(booking.endTime);
  }
}

function isAllowed(
  booking: Booking,
  action: BookingLifecycleAction,
  allowProviderArrivalShortcut: boolean,
): boolean {
  switch (action) {
    case "on_the_way":
      return booking.status === "assigned" || booking.status === "confirmed";
    case "arrived":
      return booking.status === "on_the_way" ||
        (allowProviderArrivalShortcut &&
          (booking.status === "assigned" || booking.status === "confirmed"));
    case "start":
      return booking.status === "arrived";
    case "complete":
      return booking.status === "in_progress";
  }
}

export async function transitionBookingLifecycle(
  deps: BookingLifecycleDependencies,
  input: BookingLifecycleInput,
): Promise<Booking> {
  const { booking, action, actor } = input;
  if (!booking.providerId) {
    throw new BookingLifecycleError(
      409,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "A Provider must be assigned before advancing this booking.",
    );
  }

  if (isIdempotentRetry(booking, action)) return booking;

  if (!isAllowed(booking, action, input.allowProviderArrivalShortcut === true)) {
    throw new BookingLifecycleError(
      409,
      "INVALID_LIFECYCLE_TRANSITION",
      "Cannot apply " + action + " while booking is " + booking.status + ".",
    );
  }

  let updated: Booking;
  switch (action) {
    case "on_the_way":
      updated = await deps.markOnTheWay(booking.id);
      break;
    case "arrived":
      updated = await deps.markArrived(booking.id, input.baseDurationMinutes ?? 60);
      break;
    case "start":
      updated = await deps.startServiceTimer(booking.id);
      break;
    case "complete":
      updated = await deps.completeServiceTimer(booking.id);
      break;
  }

  const event = action === "start" ? "started" : action === "complete" ? "completed" : action;
  await deps.notifyCustomer(event, updated);
  await deps.publishUpdate(action, updated);
  if (action === "complete") await deps.afterCompletion?.(updated);

  if (actor.type === "admin") {
    await deps.audit?.({
      bookingId: booking.id,
      previousStatus: booking.status,
      newStatus: targetStatus[action],
      actorType: actor.type,
      actorId: actor.id,
      timestamp: new Date().toISOString(),
    });
  }

  return updated;
}
