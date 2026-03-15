/**
 * Debug utilities for Firebase Auth persistence
 * Helps diagnose session restoration issues
 */

import { logger } from "./logger";

const DEBUG_KEY = "__bocado_auth_debug";

interface AuthDebugInfo {
  timestamp: number;
  firebaseKeys: string[];
  localStorageSize: number;
  hasAuthToken: boolean;
  sessionStorageSize: number;
  isBrowser: boolean;
}

/**
 * Obtiene diagnóstico completo del estado de autenticación
 */
export const captureAuthState = (): AuthDebugInfo => {
  if (typeof window === "undefined") {
    return {
      timestamp: Date.now(),
      firebaseKeys: [],
      localStorageSize: 0,
      hasAuthToken: false,
      sessionStorageSize: 0,
      isBrowser: false,
    };
  }

  try {
    // Buscar cualquier clave de Firebase Auth
    const firebaseKeys = Object.keys(localStorage).filter(
      (key) =>
        key.includes("firebase") ||
        key.includes("auth") ||
        key.includes("persistence"),
    );

    const hasAuthToken = firebaseKeys.length > 0;

    const localStorageSize = JSON.stringify(localStorage).length;
    const sessionStorageSize = JSON.stringify(sessionStorage).length;

    const info: AuthDebugInfo = {
      timestamp: Date.now(),
      firebaseKeys,
      localStorageSize,
      hasAuthToken,
      sessionStorageSize,
      isBrowser: true,
    };

    // Guardar en localStorage para análisis posterior
    try {
      localStorage.setItem(DEBUG_KEY, JSON.stringify(info));
    } catch (e) {
      // Ignore if storage is full
    }

    return info;
  } catch (e) {
    logger.warn("[authDebug] Error capturing auth state:", e);
    return {
      timestamp: Date.now(),
      firebaseKeys: [],
      localStorageSize: 0,
      hasAuthToken: false,
      sessionStorageSize: 0,
      isBrowser: true,
    };
  }
};

/**
 * Logs auth state in development
 */
export const logAuthState = (label: string): void => {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "development") {
    return;
  }

  const state = captureAuthState();
  console.group(
    `%c🔐 Auth State: ${label}`,
    "color: #00a8e8; font-weight: bold",
  );
  console.log("Firebase Keys:", state.firebaseKeys);
  console.log("Has Auth Token:", state.hasAuthToken);
  console.log("LocalStorage Size:", state.localStorageSize, "bytes");
  console.log("SessionStorage Size:", state.sessionStorageSize, "bytes");
  console.log("Timestamp:", new Date(state.timestamp).toISOString());
  console.groupEnd();
};

/**
 * Verifica si localStorage está siendo limpiado constantemente
 */
export const detectStoragePurge = (): {
  detected: boolean;
  previousSize?: number;
  currentSize: number;
  diff: number;
} => {
  if (typeof window === "undefined") {
    return { detected: false, currentSize: 0, diff: 0 };
  }

  try {
    const previousInfo = localStorage.getItem(DEBUG_KEY);
    const currentSize = JSON.stringify(localStorage).length;

    if (!previousInfo) {
      return { detected: false, currentSize, diff: 0 };
    }

    const previous = JSON.parse(previousInfo);
    const diff = currentSize - previous.localStorageSize;
    const detected = diff < -1000; // Si desapareció > 1KB, algo está limpiando

    return { detected, previousSize: previous.localStorageSize, currentSize, diff };
  } catch (e) {
    return { detected: false, currentSize: 0, diff: 0 };
  }
};

/**
 * Muestra si el navegador está en modo incógnito/privado
 */
export const detectPrivateMode = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    try {
      const fs = window.localStorage;
      const x = "__private_mode_test__";
      fs.setItem(x, x);
      fs.removeItem(x);
      resolve(false); // Normal mode
    } catch (e) {
      // Modo privado/incógnito
      resolve(true);
    }
  });
};

/**
 * Verifica que Firebase tokens estén siendo guardados correctamente
 */
export const validateAuthTokenStorage = (): {
  valid: boolean;
  details: string;
} => {
  if (typeof window === "undefined") {
    return { valid: false, details: "Not in browser" };
  }

  try {
    // Firebase almacena tokens en formato: firebase:authUser:<apiKey>
    const firebaseKeys = Object.keys(localStorage).filter((k) =>
      k.includes("firebase:authUser"),
    );

    if (firebaseKeys.length === 0) {
      return { valid: false, details: "No firebase auth tokens found" };
    }

    // Intentar parsear uno de los tokens
    for (const key of firebaseKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const hasValidToken =
            parsed.stsTokenManager &&
            parsed.stsTokenManager.accessToken &&
            parsed.uid;

          if (hasValidToken) {
            return {
              valid: true,
              details: `Valid token for ${parsed.email || "unknown user"}`,
            };
          }
        }
      } catch (e) {
        // Continue to next key
      }
    }

    return { valid: false, details: "Found auth keys but tokens are invalid" };
  } catch (e) {
    return { valid: false, details: `Validation error: ${String(e)}` };
  }
};
