import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";

export class FirebaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigurationError";
  }
}

let firebaseApp: App | undefined;

export function getFirebaseApp(): App {
  if (firebaseApp) return firebaseApp;
  if (getApps().length) return getApps()[0]!;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new FirebaseConfigurationError("FCM is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON before sending pushes.");
  }

  try {
    const serviceAccount = JSON.parse(rawServiceAccount) as Record<string, unknown>;
    if (typeof serviceAccount.private_key === "string" && serviceAccount.private_key.includes("\\n")) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    return firebaseApp;
  } catch {
    throw new FirebaseConfigurationError("FCM is not configured. FIREBASE_SERVICE_ACCOUNT_JSON must be valid service-account JSON.");
  }
}

export function resetFirebaseAppForTests() {
  firebaseApp = undefined;
}