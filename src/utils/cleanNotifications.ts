/**
 * Utilidad para limpiar datos corruptos de notificaciones
 * Se ejecuta automáticamente en los hooks, pero puede llamarse manualmente si es necesario
 */

const STORAGE_KEYS = [
  "bocado_notification_schedules",
  "bocado_smart_reminders",
];

export function cleanCorruptedNotifications(): {
  cleaned: boolean;
  keys: string[];
} {
  if (typeof window === "undefined") return { cleaned: false, keys: [] };
  const cleanedKeys: string[] = [];

  STORAGE_KEYS.forEach((key) => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasCorruptedData =
          Array.isArray(parsed) &&
          parsed.some(
            (item: any) =>
              item.title?.includes("notifications.") ||
              item.title?.includes("notificacions.") ||
              item.body?.includes("notifications.") ||
              item.body?.includes("notificacions."),
          );

        if (hasCorruptedData) {
          localStorage.removeItem(key);
          cleanedKeys.push(key);
          if (process.env.NODE_ENV === "development") console.log(`✓ Limpiado: ${key}`);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.error(`Error limpiando ${key}:`, e);
      }
    }
  });

  return {
    cleaned: cleanedKeys.length > 0,
    keys: cleanedKeys,
  };
}

/**
 * Limpia todas las notificaciones mostradas (para resetear el sistema)
 */
export function resetNotificationHistory(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter(
    (key) =>
      key.startsWith("last_notification_") ||
      key.startsWith("bocado_ratings_shown") ||
      key.startsWith("bocado_last_active"),
  );

  keys.forEach((key) => localStorage.removeItem(key));
  if (process.env.NODE_ENV === "development")
    console.log(`✓ Limpiado historial de ${keys.length} notificaciones`);
}

/**
 * Función de diagnóstico para verificar el estado de las notificaciones
 */
export function diagnoseNotifications(): void {
  if (typeof window === "undefined") return;
  console.log("=== Diagnóstico de Notificaciones ===");

  STORAGE_KEYS.forEach((key) => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log(`\n${key}:`);

        if (Array.isArray(parsed)) {
          parsed.forEach((item, index) => {
            const isCorrupted =
              item.title?.includes("notifications.") ||
              item.title?.includes("notificacions.") ||
              item.body?.includes("notifications.") ||
              item.body?.includes("notificacions.");

            console.log(
              `  [${index}] ${item.id || "sin-id"}: ${isCorrupted ? "❌ CORRUPTO" : "✓ OK"}`,
            );
            if (isCorrupted) {
              console.log(`      Title: ${item.title}`);
              console.log(`      Body: ${item.body}`);
            }
          });
        }
      } catch (e) {
        console.error(`  ❌ Error parseando ${key}`);
      }
    } else {
      console.log(`\n${key}: (vacío)`);
    }
  });

  console.log("\n=== Fin del diagnóstico ===");
}

// Exponer funciones globalmente para debug en consola
if (typeof window !== "undefined") {
  (window as any).bocadoNotifications = {
    clean: cleanCorruptedNotifications,
    reset: resetNotificationHistory,
    diagnose: diagnoseNotifications,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("💡 Utilidades de notificaciones disponibles:");
    console.log(
      "   - window.bocadoNotifications.diagnose() - Verificar estado",
    );
    console.log(
      "   - window.bocadoNotifications.clean() - Limpiar datos corruptos",
    );
    console.log("   - window.bocadoNotifications.reset() - Resetear historial");
  }
}
