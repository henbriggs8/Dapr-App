import { pool } from "../server/db";
import { runPaidBookingNotificationDispatch } from "../server/paid-booking-notifications";

async function main() {
  const result = await runPaidBookingNotificationDispatch();
  console.info(`[notification] One-pass dispatcher completed (enabled=${result.enabled}).`);
}

main()
  .catch(error => {
    console.error("[notification] One-pass dispatcher failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });