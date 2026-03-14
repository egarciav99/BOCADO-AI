/**
 * Session Persistence Helper
 * Asegura que la sesión de Firebase se mantiene
 * incluso después de cerrar y reabrir la app
 */

import { logger } from "./logger";

const SESSION_KEY = "__firebase_session";
const PERSISTENCE_KEY = "__bocado_session_restored";

/**
 * Verifica si hay una sesión guardada en localStorage
 */
export const hasSessionInStorage = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    // Verificar si Firebase Auth tiene tokens guardados
    const firebaseAuth = localStorage.getItem("firebase:authUser:*");
    return !!firebaseAuth;
  } catch (e) {
    logger.warn("[SessionPersistence] Error checking session:", e);
    return false;
  }
};

/**
 * Marca que se intentó restaurar la sesión
 */
export const markSessionRestored = (): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PERSISTENCE_KEY, Date.now().toString());
  } catch (e) {
    logger.warn("[SessionPersistence] Error marking session:", e);
  }
};

/**
 * Verifica si ya se intentó restaurar la sesión en esta página
 */
export const wasSessionRestored = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return !!sessionStorage.getItem(PERSISTENCE_KEY);
  } catch (e) {
    return false;
  }
};

/**
 * Limpia datos de sesión (solo cuando se hace logout explícito)
 */
export const clearSessionData = (): void => {
  if (typeof window === "undefined") return;
  try {
    // NO borrar localStorage aquí — Firebase Auth lo maneja
    // Solo limpiar nuestros markers
    sessionStorage.removeItem(PERSISTENCE_KEY);
    logger.info("[SessionPersistence] Session data cleared");
  } catch (e) {
    logger.warn("[SessionPersistence] Error clearing session:", e);
  }
};

/**
 * Obtiene diagnóstico de persistencia
 */
export const getSessionDiagnostics = (): {
  hasStorageSession: boolean;
  wasRestored: boolean;
  storageAvailable: boolean;
  keys: string[];
} => {
  if (typeof window === "undefined") {
    return {
      hasStorageSession: false,
      wasRestored: false,
      storageAvailable: false,
      keys: [],
    };
  }

  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.includes("firebase") || k.includes("bocado"),
    );
    return {
      hasStorageSession: hasSessionInStorage(),
      wasRestored: wasSessionRestored(),
      storageAvailable: true,
      keys,
    };
  } catch (e) {
    return {
      hasStorageSession: false,
      wasRestored: false,
      storageAvailable: false,
      keys: [],
    };
  }
};
