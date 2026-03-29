/**
 * Firebase Auth Token Persistence Manager
 * 
 * Explicitly saves and restores Firebase Auth tokens
 * to workaround potential persistence configuration issues
 * 
 * Uses sessionStorage for security: data is cleared when browser tab closes
 */

import { User, onAuthStateChanged } from "firebase/auth";
import { logger } from "./logger";

const TOKEN_STORAGE_KEY = "bocado_firebase_auth_token_v1";
const REFRESH_KEY = "bocado_auth_refresh_v1";

interface SavedAuthToken {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    createdAt?: number;
    lastSignInTime?: number;
  };
  customClaims?: Record<string, any>;
  savedAt: number;
}

/**
 * Guarda explícitamente los datos del usuario para poder restaurarlo
 * NO guarda credenciales - solo info pública del usuario
 * Usa sessionStorage: se borra al cerrar la pestaña
 */
export const saveUserDataForOffline = (user: User | null): void => {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      const tokenData: SavedAuthToken = {
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        metadata: {
          // Firebase metadata returns strings (ISO 8601), convert to timestamp
          createdAt: user.metadata.creationTime
            ? new Date(user.metadata.creationTime).getTime()
            : undefined,
          lastSignInTime: user.metadata.lastSignInTime
            ? new Date(user.metadata.lastSignInTime).getTime()
            : undefined,
        },
        savedAt: Date.now(),
      };

      sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
      logger.info("[TokenPersistence] User data saved for session");
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
      logger.info("[TokenPersistence] User data cleared");
    }
  } catch (e) {
    logger.warn("[TokenPersistence] Failed to save user data:", e);
  }
};

/**
 * Restaura los datos del usuario desde el almacenamiento de sesión
 * Útil para mostrar información de usuario mientras se restaura la sesión desde Firebase
 */
export const getOfflineUserData = (): SavedAuthToken | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as SavedAuthToken;

    // Si los datos tienen más de 24 horas, descartar (sessionStorage ya limpia al cerrar, pero por si acaso)
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }

    return data;
  } catch (e) {
    logger.warn("[TokenPersistence] Failed to restore user data:", e);
    return null;
  }
};

/**
 * Obtiene el último tiempo de refresh del token
 * Ayuda a detectar si el token está siendo refrescado correctamente
 */
export const getLastTokenRefreshTime = (): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(REFRESH_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
};

/**
 * Marca que el token fue refrescado
 */
export const recordTokenRefresh = (): void => {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(REFRESH_KEY, Date.now().toString());
  } catch (e) {
    logger.warn("[TokenPersistence] Failed to record refresh:", e);
  }
};

/**
 * Diagnóstico: Verifica si hay tokens de Firebase en storage
 */
export const getFirebaseTokenDiagnostics = (): {
  hasTokens: boolean;
  tokenKeys: string[];
  offlineDataExists: boolean;
  lastRefresh?: number;
} => {
  if (typeof window === "undefined") {
    return {
      hasTokens: false,
      tokenKeys: [],
      offlineDataExists: false,
    };
  }

  try {
    // Firebase uses localStorage for its own tokens (we can't change that)
    // But we check both storages for diagnostic purposes
    const localStorageKeys = Object.keys(localStorage).filter(
      (k) =>
        k.includes("firebase:authUser") ||
        k.includes("firebase:authIdToken") ||
        k.includes("stsTokenManager"),
    );

    return {
      hasTokens: localStorageKeys.length > 0,
      tokenKeys: localStorageKeys,
      offlineDataExists: !!sessionStorage.getItem(TOKEN_STORAGE_KEY),
      lastRefresh: getLastTokenRefreshTime() || undefined,
    };
  } catch (e) {
    return {
      hasTokens: false,
      tokenKeys: [],
      offlineDataExists: false,
    };
  }
};
