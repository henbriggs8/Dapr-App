---
name: Clerk 2FA bug — attemptSecondFactor vs attemptFirstFactor
description: When password sign-in returns needs_second_factor, the OTP must be verified with attemptSecondFactor not attemptFirstFactor. Clerk returns "verification_not_sent" (400) if you call the wrong one.
---

## The Rule
After `signIn.attemptFirstFactor({ strategy: 'password' })` returns `status: 'needs_second_factor'`:
1. Call `signIn.prepareSecondFactor({ strategy: 'phone_code' })` — sends the OTP
2. Call `signIn.attemptSecondFactor({ strategy: 'phone_code', code })` — verifies it

**Never** call `attemptFirstFactor` again for the second-factor OTP. Clerk will return `verification_not_sent` (400) because the pending verification is registered on the *second* factor slot, not the first.

**Why:** Clerk tracks first and second factor verifications separately. `attemptFirstFactor` with `phone_code` only works when phone is the *primary* auth method, not when it's MFA after a password.

## How to Apply
In `clerk-auth-page.tsx`, use a boolean state flag (`isSecondFactor`) set to `true` when entering the `needs_second_factor` path. In `handlePhoneOtpNext`, branch on this flag:
- `isSecondFactor === true` → `attemptSecondFactor`
- `isSecondFactor === false` → `attemptFirstFactor` (phone as primary or reset)
- `mode === 'signUp'` → `attemptPhoneNumberVerification`
