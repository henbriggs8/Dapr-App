import assert from "node:assert/strict";
import test from "node:test";
import { isAdminDispatchCandidate } from "../shared/admin-dispatch";

test("paid confirmed unassigned bookings are visible to Admin Dispatch", () => {
  assert.equal(
    isAdminDispatchCandidate({
      status: "confirmed",
      isPaid: true,
      paymentStatus: "completed",
      providerId: null,
    }),
    true,
  );
});

test("Admin Dispatch excludes unsafe lifecycle states and assignments", () => {
  for (const status of ["pending", "cancelled", "completed", "refunded"]) {
    assert.equal(
      isAdminDispatchCandidate({
        status,
        isPaid: true,
        paymentStatus: "completed",
        providerId: null,
      }),
      false,
    );
  }

  assert.equal(
    isAdminDispatchCandidate({
      status: "confirmed",
      isPaid: false,
      paymentStatus: "pending",
      providerId: null,
    }),
    false,
  );
  assert.equal(
    isAdminDispatchCandidate({
      status: "confirmed",
      isPaid: true,
      paymentStatus: "completed",
      providerId: 42,
    }),
    false,
  );
});

test("zero-amount paid bookings remain dispatchable", () => {
  assert.equal(
    isAdminDispatchCandidate({
      status: "confirmed",
      isPaid: true,
      paymentStatus: "paid",
      providerId: null,
    }),
    true,
  );
});
