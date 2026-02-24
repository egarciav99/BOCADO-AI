import { logger } from "../utils/logger";

const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (typeof value === "undefined") {
    logger.warn(`Missing environment variable: ${key}`);
    return "";
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnvVar("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnvVar("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("NEXT_PUBLIC_FIREBASE_APP_ID"),
  vapidKey: getEnvVar("NEXT_PUBLIC_FIREBASE_VAPID_KEY"),
};

const apiConfig = {
  recommendationUrl: "/api/recommend",
  registerUserUrl: getEnvVar("NEXT_PUBLIC_REGISTER_USER_URL"),
  // ✅ REMOVED: googleMapsApiKey ya no se usa en frontend
  // Las llamadas a Maps ahora van al proxy protegido: /api/maps-proxy
};

// Rango de búsqueda de restaurantes en metros
export const SEARCH_RADIUS = {
  meters: 8000, // 8km por defecto
  label: "8 km",
};

export const env = Object.freeze({
  firebase: firebaseConfig,
  api: apiConfig,
});
