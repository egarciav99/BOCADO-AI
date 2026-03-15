/**
 * Session Debug Logger - Guarda información en localStorage para debugging
 * Funciona incluso cuando console.log no se muestra
 */

import { logger } from "./logger";

const DEBUG_LOG_KEY = "__bocado_debug_logs";
const MAX_LOGS = 100;

interface DebugLog {
  timestamp: number;
  type: "info" | "warn" | "error" | "state";
  message: string;
  data?: any;
}

/**
 * Agrega una entrada al debug log
 */
export const debugLog = (
  type: "info" | "warn" | "error" | "state",
  message: string,
  data?: any,
): void => {
  // ✅ IMPORTANTE: Funciona incluso en Browser y Server
  if (typeof window === "undefined") {
    // En servidor: solo log a consola
    console.log(`[DEBUGLOG] [${type.toUpperCase()}] ${message}`, data || "");
    return;
  }

  // En navegador: guardar en localStorage
  try {
    const logs: DebugLog[] = JSON.parse(
      localStorage.getItem(DEBUG_LOG_KEY) || "[]",
    );

    const newLog = {
      timestamp: Date.now(),
      type,
      message,
      data,
    };

    logs.push(newLog);

    // Mantener solo los últimos 100 logs
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }

    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(logs));

    // ✅ CRÍTICO: Siempre loguear en consola para ver en tiempo real
    const styles = {
      info: "color: #3498db",
      warn: "color: #f39c12",
      error: "color: #e74c3c",
      state: "color: #2ecc71; font-weight: bold",
    };
    
    console.log(
      `%c[BOCADO DEBUG] ${message}`,
      styles[type],
      data || "",
    );
  } catch (e) {
    // Si localStorage falla, al menos loguear en consola
    console.error("[debugLog] CRITICAL ERROR:", e);
    console.log(`[${type.toUpperCase()}] ${message}`, data || "");
  }
};

/**
 * Obtiene todos los logs
 */
export const getDebugLogs = (): DebugLog[] => {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(DEBUG_LOG_KEY) || "[]");
  } catch {
    return [];
  }
};

/**
 * Limpia los logs
 */
export const clearDebugLogs = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(DEBUG_LOG_KEY);
  } catch {
    // ignore
  }
};

/**
 * Muestra los logs en la consola (útil para debugging)
 */
export const dumpDebugLogs = (): void => {
  if (typeof window === "undefined") return;

  const logs = getDebugLogs();

  console.group(
    "%c📊 DEBUG LOGS - Session Persistence",
    "color: #9b59b6; font-size: 14px; font-weight: bold",
  );
  console.log(`Total logs: ${logs.length}`);
  console.log("---");

  logs.forEach((log, idx) => {
    const date = new Date(log.timestamp).toLocaleTimeString();
    const styles = {
      info: "color: #3498db",
      warn: "color: #f39c12",
      error: "color: #e74c3c",
      state: "color: #2ecc71; font-weight: bold",
    };

    console.log(
      `%c[${idx + 1}] ${date} [${log.type.toUpperCase()}] ${log.message}`,
      styles[log.type],
    );

    if (log.data) {
      console.log("   Data:", log.data);
    }
  });

  console.log("---");
  console.groupEnd();
};

/**
 * Exporta los logs como JSON para compartir
 */
export const exportDebugLogs = (): string => {
  const logs = getDebugLogs();
  return JSON.stringify(logs, null, 2);
};

/**
 * Helper para verificar si hay sesión guardada
 */
export const logSessionStatus = (): void => {
  if (typeof window === "undefined") return;

  debugLog("state", "Session Status Check", {
    firebaseKeys: Object.keys(localStorage).filter((k) =>
      k.includes("firebase"),
    ),
    localStorageKeys: Object.keys(localStorage).length,
    hasBocanToken: !!localStorage.getItem("bocado_firebase_auth_token_v1"),
    timestamp: new Date().toISOString(),
  });
};
