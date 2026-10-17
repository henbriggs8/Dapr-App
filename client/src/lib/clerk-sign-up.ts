type SignUpAttempt = {
  status: string | null;
  createdSessionId: string | null;
  unverifiedFields: string[];
  preparePhoneNumberVerification(params: { strategy: "phone_code" }): Promise<unknown>;
  prepareEmailAddressVerification(params: { strategy: "email_code" }): Promise<unknown>;
};

// The verified Clerk attempt controls progression, never a backend-created password.
export async function advanceClerkSignUp(attempt: SignUpAttempt): Promise<
  { step: "complete"; sessionId: string } | { step: "phoneOtp" | "emailOtp" }
> {
  if (attempt.status === "complete" && attempt.createdSessionId) {
    return { step: "complete", sessionId: attempt.createdSessionId };
  }
  const fields = attempt.unverifiedFields.map(field => field.replace(/_/g, "").toLowerCase());
  if (fields.includes("phonenumber")) {
    await attempt.preparePhoneNumberVerification({ strategy: "phone_code" });
    return { step: "phoneOtp" };
  }
  if (fields.includes("emailaddress")) {
    await attempt.prepareEmailAddressVerification({ strategy: "email_code" });
    return { step: "emailOtp" };
  }
  throw new Error("Clerk requires additional account information. Please review your sign-up details or sign in to your existing account.");
}
