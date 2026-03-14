import { initializeApp, getApps, App } from "firebase-admin/app";
import { cert } from "firebase-admin/app";

/**
 * Shared Firebase Admin initialization.
 * Prevents duplicating initialization logic across multiple API routes.
 * 
 * This is a singleton pattern - Firebase Admin SDK handles the actual singleton,
 * we just ensure consistent initialization across all API endpoints.
 * 
 * Usage:
 * ```typescript
 * import { initFirebaseAdmin } from "../../lib/api/firebase-admin";
 * 
 * const adminApp = initFirebaseAdmin();
 * const db = adminApp ? getFirestore() : null;
 * ```
 */
export function initFirebaseAdmin(): App | null {
  // Firebase Admin SDK automatically prevents double initialization
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error(
      "❌ FIREBASE_SERVICE_ACCOUNT_KEY not configured. " +
      "Check your Vercel/deployment environment variables."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey.trim());
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    return null;
  }
}
