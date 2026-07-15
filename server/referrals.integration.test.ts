import assert from "node:assert/strict";
import {
  cleanupReferralTestRecords,
  prepareTestDatabase,
  redactDatabaseUrl,
  requireSafeTestDatabaseUrl,
} from "./test/test-database";

const testDatabaseUrl = requireSafeTestDatabaseUrl();
console.log(`[referral-test] Isolated database: ${redactDatabaseUrl(testDatabaseUrl)}`);

process.env.DATABASE_URL = testDatabaseUrl;

const pool = await prepareTestDatabase(testDatabaseUrl);
const userIds: number[] = [];
const bookingIds: number[] = [];
const runId = `referral_it_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let applicationPool: { end(): Promise<void> } | undefined;

function assertReferralError(error: unknown, expectedCode: string): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === expectedCode);
}

async function main() {
  const { storage } = await import("./storage");
  const { db, pool: importedApplicationPool } = await import("./db");
  applicationPool = importedApplicationPool;
  const { referrals, users } = await import("@shared/schema");
  const { eq, and } = await import("drizzle-orm");

  async function createCustomer(label: string) {
    const user = await storage.createUser({
      username: `${runId}_${label}`,
      password: "integration-test-not-for-login",
      name: `Referral integration ${label}`,
      isProvider: false,
      isAdmin: false,
    });
    userIds.push(user.id);
    return user;
  }

  async function createTestBooking(userId: number, suffix: string) {
    const booking = await storage.createBooking({
      userId,
      providerId: null,
      serviceId: 1,
      timeSlotId: 1,
      vehicleId: null,
      status: "pending",
      priceTier: "basic",
      timestamp: new Date().toISOString(),
      serviceLocation: `INTEGRATION TEST ${runId} ${suffix}`,
      serviceLocationType: "other",
      addOns: [],
      addOnTotal: 0,
      totalPrice: 39,
      isPaid: false,
      paymentStatus: "pending",
    });
    bookingIds.push(booking.id);
    return booking;
  }

  console.log("[referral-test] Scenario 1: first-booking discount");
  const referrerA = await createCustomer("discount_referrer");
  const referredB = await createCustomer("discount_referred");
  assert.ok(referrerA.referralCode);
  await storage.applyReferralCode(referredB.id, referrerA.referralCode);

  const firstBooking = await createTestBooking(referredB.id, "first");
  assert.equal(firstBooking.totalPrice, 19);
  assert.equal(firstBooking.referralDiscountCents, 2000);
  const [appliedReferral] = await db.select().from(referrals).where(eq(referrals.referredUserId, referredB.id));
  assert.equal(appliedReferral.discountStatus, "applied");
  assert.equal(appliedReferral.relatedBookingId, firstBooking.id);

  const secondBooking = await createTestBooking(referredB.id, "second");
  assert.equal(secondBooking.totalPrice, 39);
  assert.equal(secondBooking.referralDiscountCents, 0);

  console.log("[referral-test] Scenario 2: paid completion reward");
  await storage.updateBookingPaymentInfo(firstBooking.id, { isPaid: true, paymentStatus: "completed" });
  await storage.updateBookingStatus(firstBooking.id, "completed", "completed");

  console.log("[referral-test] Scenario 3: concurrent and repeated award protection");
  const concurrentAwards = await Promise.all([
    storage.awardReferralForCompletedBooking(firstBooking.id),
    storage.awardReferralForCompletedBooking(firstBooking.id),
  ]);
  assert.equal(concurrentAwards.filter(Boolean).length, 1);
  assert.equal(await storage.awardReferralForCompletedBooking(firstBooking.id), false);
  await storage.updateBookingPaymentInfo(firstBooking.id, { isPaid: true, paymentStatus: "completed" });
  await storage.updateBookingStatus(firstBooking.id, "completed", "completed");
  assert.equal(await storage.awardReferralForCompletedBooking(firstBooking.id), false);

  const rewardedA = await storage.getUser(referrerA.id);
  assert.equal(rewardedA?.referralCreditBalanceCents, 2000);
  const [rewardedReferral] = await db.select().from(referrals).where(eq(referrals.referredUserId, referredB.id));
  assert.equal(rewardedReferral.rewardStatus, "rewarded");
  assert.equal(rewardedReferral.discountStatus, "redeemed");
  assert.ok(rewardedReferral.completedAt);
  assert.ok(rewardedReferral.rewardedAt);
  const singleReward = await db.select().from(referrals).where(and(
    eq(referrals.referrerId, referrerA.id),
    eq(referrals.rewardStatus, "rewarded"),
  ));
  assert.equal(singleReward.length, 1);

  console.log("[referral-test] Scenario 4: five-referral / $100 cap");
  const capReferrer = await createCustomer("cap_referrer");
  assert.ok(capReferrer.referralCode);
  const capCustomers = [];
  for (let index = 1; index <= 6; index++) {
    const customer = await createCustomer(`cap_referred_${index}`);
    await storage.applyReferralCode(customer.id, capReferrer.referralCode);
    capCustomers.push(customer);
  }

  const capBookings = [];
  for (const [index, customer] of capCustomers.entries()) {
    const booking = await createTestBooking(customer.id, `cap_${index + 1}`);
    assert.equal(booking.totalPrice, 19);
    assert.equal(booking.referralDiscountCents, 2000);
    capBookings.push(booking);
  }

  for (const booking of capBookings) {
    await storage.updateBookingPaymentInfo(booking.id, { isPaid: true, paymentStatus: "completed" });
    await storage.updateBookingStatus(booking.id, "completed", "completed");
    await storage.awardReferralForCompletedBooking(booking.id);
  }

  const capSummary = await storage.getReferralInfo(capReferrer.id);
  assert.equal(capSummary.successfulReferralCount, 5);
  assert.equal(capSummary.creditBalanceCents, 10000);
  assert.equal(capSummary.totalCreditsEarnedCents, 10000);
  const [sixthReferral] = await db.select().from(referrals).where(eq(referrals.referredUserId, capCustomers[5].id));
  assert.equal(sixthReferral.rewardStatus, "limit_reached");
  assert.equal(sixthReferral.discountStatus, "redeemed");

  const seventhCustomer = await createCustomer("cap_referred_7");
  await assert.rejects(
    () => storage.applyReferralCode(seventhCustomer.id, capReferrer.referralCode!),
    (error) => assertReferralError(error, "REFERRAL_LIMIT_REACHED"),
  );
  const [capBalance] = await db.select({ balance: users.referralCreditBalanceCents }).from(users).where(eq(users.id, capReferrer.id));
  assert.equal(capBalance.balance, 10000);

  console.log("[referral-test] PASS: all referral integration scenarios completed.");
}

let testFailure: unknown;
try {
  await main();
} catch (error) {
  testFailure = error;
  console.error("[referral-test] FAIL:", error);
} finally {
  try {
    await cleanupReferralTestRecords(pool, userIds, bookingIds);
    console.log(`[referral-test] Cleanup complete (${bookingIds.length} bookings, ${userIds.length} users).`);
  } catch (cleanupError) {
    console.error("[referral-test] CLEANUP FAILED:", cleanupError);
    testFailure ??= cleanupError;
  } finally {
    if (applicationPool) await applicationPool.end();
    await pool.end();
  }
}

if (testFailure) process.exitCode = 1;
