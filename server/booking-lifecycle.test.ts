import assert from "node:assert/strict";
import test from "node:test";
import type { Booking } from "@shared/schema";
import {
  BookingLifecycleError,
  canUseAdminLifecycle,
  nextAdminLifecycleAction,
  transitionBookingLifecycle,
  type BookingLifecycleDependencies,
} from "./booking-lifecycle";

function booking(status: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id: 127,
    status,
    providerId: 42,
    arrivalTime: null,
    startTime: null,
    endTime: null,
    ...overrides,
  } as Booking;
}

function harness() {
  const calls: string[] = [];
  const deps: BookingLifecycleDependencies = {
    async markOnTheWay(id) {
      calls.push(`markOnTheWay:${id}`);
      return booking("on_the_way");
    },
    async markArrived(id, minutes) {
      calls.push(`markArrived:${id}:${minutes}`);
      return booking("arrived", { arrivalTime: new Date() });
    },
    async startServiceTimer(id) {
      calls.push(`startServiceTimer:${id}`);
      return booking("in_progress", { startTime: new Date() });
    },
    async completeServiceTimer(id) {
      calls.push(`completeServiceTimer:${id}`);
      return booking("completed", {
        startTime: new Date(),
        endTime: new Date(),
      });
    },
    notifyCustomer(event) {
      calls.push(`notify:${event}`);
    },
    publishUpdate(action) {
      calls.push(`publish:${action}`);
    },
    afterCompletion() {
      calls.push("afterCompletion");
    },
    audit(entry) {
      calls.push(`audit:${entry.previousStatus}->${entry.newStatus}`);
    },
  };
  return { calls, deps };
}

test("only authenticated admins pass the lifecycle authorization guard", () => {
  assert.equal(canUseAdminLifecycle({ isAdmin: true }), true);
  assert.equal(canUseAdminLifecycle({ isAdmin: false }), false);
  assert.equal(canUseAdminLifecycle(null), false);
  assert.equal(canUseAdminLifecycle(undefined), false);
});

test("admin controls expose exactly the next valid transition", () => {
  assert.equal(nextAdminLifecycleAction("assigned"), "on_the_way");
  assert.equal(nextAdminLifecycleAction("confirmed"), "on_the_way");
  assert.equal(nextAdminLifecycleAction("on_the_way"), "arrived");
  assert.equal(nextAdminLifecycleAction("arrived"), "start");
  assert.equal(nextAdminLifecycleAction("in_progress"), "complete");
  for (const terminal of ["completed", "cancelled", "refunded", "pending"]) {
    assert.equal(nextAdminLifecycleAction(terminal), null);
  }
});

test("valid admin transitions run canonical mutations, notifications, realtime, and audit", async () => {
  const cases = [
    ["assigned", "on_the_way", "on_the_way"],
    ["on_the_way", "arrived", "arrived"],
    ["arrived", "start", "in_progress"],
    ["in_progress", "complete", "completed"],
  ] as const;

  for (const [from, action, to] of cases) {
    const { calls, deps } = harness();
    const result = await transitionBookingLifecycle(deps, {
      booking: booking(from),
      action,
      actor: { type: "admin", id: 9 },
      baseDurationMinutes: 90,
    });
    assert.equal(result.status, to);
    assert.equal(
      calls.some((call) => call.startsWith("notify:")),
      true,
    );
    assert.equal(calls.includes(`publish:${action}`), true);
    assert.equal(calls.includes(`audit:${from}->${to}`), true);
    assert.equal(calls.includes("afterCompletion"), action === "complete");
  }
});

test("invalid, terminal, and unassigned transitions are rejected before mutation", async () => {
  const invalid = [
    [booking("assigned"), "start"],
    [booking("arrived"), "complete"],
    [booking("completed", { endTime: null }), "complete"],
    [booking("cancelled"), "on_the_way"],
    [booking("refunded"), "on_the_way"],
    [booking("assigned", { providerId: null }), "on_the_way"],
  ] as const;

  for (const [record, action] of invalid) {
    const { calls, deps } = harness();
    await assert.rejects(
      transitionBookingLifecycle(deps, {
        booking: record,
        action,
        actor: { type: "admin", id: 9 },
      }),
      (error: unknown) =>
        error instanceof BookingLifecycleError && error.status === 409,
    );
    assert.deepEqual(calls, []);
  }
});

test("idempotent completion retries do not duplicate completion side effects", async () => {
  const { calls, deps } = harness();
  const completed = booking("completed", {
    startTime: new Date(),
    endTime: new Date(),
  });
  const result = await transitionBookingLifecycle(deps, {
    booking: completed,
    action: "complete",
    actor: { type: "admin", id: 9 },
  });
  assert.equal(result, completed);
  assert.deepEqual(calls, []);
});

test("only the existing Provider path may opt into the legacy arrival shortcut", async () => {
  const adminHarness = harness();
  await assert.rejects(
    transitionBookingLifecycle(adminHarness.deps, {
      booking: booking("assigned"),
      action: "arrived",
      actor: { type: "admin", id: 9 },
    }),
    BookingLifecycleError,
  );

  const providerHarness = harness();
  const result = await transitionBookingLifecycle(providerHarness.deps, {
    booking: booking("assigned"),
    action: "arrived",
    actor: { type: "provider", id: 42 },
    allowProviderArrivalShortcut: true,
  });
  assert.equal(result.status, "arrived");
  assert.equal(
    providerHarness.calls.some((call) => call.startsWith("audit:")),
    false,
  );
});
