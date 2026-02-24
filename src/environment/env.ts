const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "",
};

const apiConfig = {
  recommendationUrl: "/api/recommend",
  registerUserUrl: process.env.NEXT_PUBLIC_REGISTER_USER_URL || "",
};

// Rango de búsqueda de restaurantes en metros
export const SEARCH_RADIUS = {
  meters: 8000, // 8km por defecto
  label: "8 km",
};

if (typeof window !== "undefined" && isDev) {
  console.log("[Env] Firebase Config Check:", {
    hasKey: !!firebaseConfig.apiKey,
    keyPrefix: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) : "NONE",
    authDomain: firebaseConfig.authDomain ? "PRESENT" : "MISSING",
    projectId: firebaseConfig.projectId ? "PRESENT (" + firebaseConfig.projectId + ")" : "MISSING"
  });
}

export const env = Object.freeze({
  firebase: firebaseConfig,
  api: apiConfig,
});
