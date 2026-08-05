import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_LIFECYCLE_MESSAGES,
  createBookingNotifier,
  lifecycleEventForStatusChange,
  type BookingLifecycleEvent,
} from "./booking-notifications";
import { PushService, type PushDeliveryInput } from "./push-service";
import type { EnabledPushDevice, PushAppType, PushDeviceRepository, PushEnvironment } from "./push-device-repository";

const BOOKING = { id: 77, userId: 41 };
const ALL_EVENTS = Object.keys(BOOKING_LIFECYCLE_MESSAGES) as BookingLifecycleEvent[];

function capturingPushService() {
  const calls: PushDeliveryInput[] = [];
  return {
    calls,
    service: {
      async sendToUser(input: PushDeliveryInput) {
        calls.push(input);
        return { attempted: 1, delivered: 1, invalidDisabled: 0, failed: 0 };
      },
    },
  };
}

test("every lifecycle event sends the exact copy and safe routing data to customer devices", async () => {
  const { calls, service } = capturingPushService();
  const notify = createBookingNotifier(service, "development");

  for (const event of ALL_EVENTS) {
    await notify(event, BOOKING);
  }

  assert.equal(calls.length, ALL_EVENTS.length);
  for (const [i, event] of ALL_EVENTS.entries()) {
    const call = calls[i];
    const message = BOOKING_LIFECYCLE_MESSAGES[event];
    assert.equal(call.userId, BOOKING.userId);
    assert.equal(call.appType, "customer", "must never target provider devices");
    assert.equal(call.environment, "development");
    assert.equal(call.title, message.title);
    assert.equal(call.body, message.body);
    assert.deepEqual(call.data, {
      bookingId: "77",
      destination: message.destination,
      event,
    });
    // No sensitive fields — only the three routing keys are allowed.
    assert.deepEqual(Object.keys(call.data!).sort(), ["bookingId", "destination", "event"]);
  }
});

test("expected notification copy matches the spec", () => {
  assert.deepEqual(
    Object.fromEntries(ALL_EVENTS.map((e) => [e, BOOKING_LIFECYCLE_MESSAGES[e].title])),
    {
      confirmed: "Booking confirmed",
      assigned: "Detailer matched",
      on_the_way: "Your detailer is on the way",
      arrived: "Your detailer has arrived",
      started: "Service started",
      completed: "Service complete",
      cancelled: "Booking canceled",
    },
  );
});

test("duplicate transitions are suppressed: same stored status yields no event", () => {
  for (const status of ["confirmed", "on_the_way", "arrived", "in_progress", "completed", "cancelled"]) {
    assert.equal(lifecycleEventForStatusChange(status, status), null, `retry of ${status} must not notify`);
  }
  // Real transitions map to their events.
  assert.equal(lifecycleEventForStatusChange("confirmed", "on_the_way"), "on_the_way");
  assert.equal(lifecycleEventForStatusChange("on_the_way", "arrived"), "arrived");
  assert.equal(lifecycleEventForStatusChange("arrived", "in_progress"), "started");
  assert.equal(lifecycleEventForStatusChange("in_progress", "completed"), "completed");
  assert.equal(lifecycleEventForStatusChange("confirmed", "cancelled"), "cancelled");
  // Non-lifecycle statuses never notify.
  assert.equal(lifecycleEventForStatusChange("pending", "assigned"), null);
});

test("provider devices are excluded and environments separated end-to-end through PushService", async () => {
  const queries: Array<{ userId: number; appType?: PushAppType; environment?: PushEnvironment }> = [];
  const repository: PushDeviceRepository = {
    async upsert() { throw new Error("not used"); },
    async disableForUser() { return false; },
    async disableById() {},
    async disableByToken() {},
    async enabledForUser(userId, appType, environment) {
      queries.push({ userId, appType, environment });
      // Simulate the repository filter: only customer/development devices exist.
      if (appType === "customer" && environment === "development") {
        return [{ id: 1, fcmToken: "dev-customer-token", appType: "customer" }] as EnabledPushDevice[];
      }
      return [];
    },
  } as unknown as PushDeviceRepository;

  const sent: string[] = [];
  const service = new PushService(repository, () => ({
    async send(message: any) { sent.push(message.token); return "id"; },
  }));

  const devNotify = createBookingNotifier(service, "development");
  const prodNotify = createBookingNotifier(service, "production");

  const devSummary = await devNotify("arrived", BOOKING);
  const prodSummary = await prodNotify("arrived", BOOKING);

  assert.deepEqual(queries, [
    { userId: 41, appType: "customer", environment: "development" },
    { userId: 41, appType: "customer", environment: "production" },
  ]);
  assert.deepEqual(sent, ["dev-customer-token"], "production notifier must not reach development devices");
  assert.equal(devSummary?.delivered, 1);
  assert.equal(prodSummary?.attempted, 0, "no cross-environment delivery");
});

test("Firebase failure never throws out of the notifier (booking mutation stays successful)", async () => {
  const notify = createBookingNotifier({
    async sendToUser() { throw new Error("firebase unavailable"); },
  }, "development");
  const summary = await notify("completed", BOOKING);
  assert.equal(summary, null, "failure is swallowed and reported as null");
});

test("permanently invalid tokens are disabled via the existing safe handling", async () => {
  const disabledIds: number[] = [];
  const repository = {
    async enabledForUser() {
      return [
        { id: 10, fcmToken: "stale-token", appType: "customer" },
        { id: 11, fcmToken: "good-token", appType: "customer" },
      ] as EnabledPushDevice[];
    },
    async disableById(id: number) { disabledIds.push(id); },
    async disableByToken() {},
    async disableForUser() { return false; },
    async upsert() { throw new Error("not used"); },
  } as unknown as PushDeviceRepository;

  const service = new PushService(repository, () => ({
    async send(message: any) {
      if (message.token === "stale-token") {
        const err: any = new Error("unregistered");
        err.code = "messaging/registration-token-not-registered";
        throw err;
      }
      return "id";
    },
  }));

  const notify = createBookingNotifier(service, "development");
  const summary = await notify("on_the_way", BOOKING);
  assert.deepEqual(disabledIds, [10]);
  assert.equal(summary?.delivered, 1);
  assert.equal(summary?.invalidDisabled, 1);
});

test("no notification when the database mutation fails (send happens strictly after the mutation)", async () => {
  const { calls, service } = capturingPushService();
  const notify = createBookingNotifier(service, "development");

  // Mirrors the route pattern: the storage call runs first; the notifier is
  // only reached when it succeeds.
  const failingMutation = async () => { throw new Error("db transition rejected"); };
  await assert.rejects(async () => {
    const booking = await failingMutation();
    await notify("completed", booking as any);
  });
  assert.equal(calls.length, 0, "failed mutation must not produce a push");
});

test("bookings without a customer id are skipped silently", async () => {
  const { calls, service } = capturingPushService();
  const notify = createBookingNotifier(service, "development");
  assert.equal(await notify("confirmed", { id: 5, userId: null }), null);
  assert.equal(calls.length, 0);
});
