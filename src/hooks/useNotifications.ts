import { useState, useEffect, useCallback, useRef } from "react";
import {
  requestNotificationPermission,
  onForegroundMessage,
  areNotificationsSupported,
  trackEvent,
} from "../firebaseConfig";
import { logger } from "../utils/logger";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db, serverTimestamp } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";

export interface NotificationSchedule {
  id: string;
  type: "meal" | "pantry" | "rating" | "engagement" | "custom";
  title: string;
  body: string;
  hour: number;
  minute: number;
  enabled: boolean;
  condition?: "always" | "pantry_empty" | "pending_ratings" | "inactive_user";
  lastShown?: string; // ISO date string
  minDaysBetween?: number; // Días mínimos entre repeticiones
}

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | null;
  token: string | null;
  schedules: NotificationSchedule[];
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  updateSchedule: (id: string, updates: Partial<NotificationSchedule>) => void;
  toggleSchedule: (id: string) => void;
  checkAndShowNotifications: () => void;
  sendTestNotification: () => Promise<boolean>;
  pendingRatingsCount: number;
  daysSinceLastPantryUpdate: number | null;
  daysSinceLastAppUse: number;
  lastMessage: any | null;
}

// Config only — stable, no translation needed
const DEFAULT_SCHEDULE_CONFIG: Omit<NotificationSchedule, 'title' | 'body'>[] = [
  {
    id: "breakfast",
    type: "meal",
    hour: 8,
    minute: 0,
    enabled: true,
    condition: "always",
    minDaysBetween: 1,
  },
  {
    id: "lunch",
    type: "meal",
    hour: 13,
    minute: 30,
    enabled: true,
    condition: "always",
    minDaysBetween: 1,
  },
  {
    id: "dinner",
    type: "meal",
    hour: 19,
    minute: 30,
    enabled: true,
    condition: "always",
    minDaysBetween: 1,
  },
  {
    id: "pantryUpdate",
    type: "pantry",
    hour: 10,
    minute: 0,
    enabled: true,
    condition: "pantry_empty",
    minDaysBetween: 3,
  },
  {
    id: "rateRecipes",
    type: "rating",
    hour: 15,
    minute: 0,
    enabled: true,
    condition: "pending_ratings",
    minDaysBetween: 2,
  },
  {
    id: "comeBack",
    type: "engagement",
    hour: 12,
    minute: 0,
    enabled: true,
    condition: "inactive_user",
    minDaysBetween: 7,
  },
];

// Hydrate with translations at render time
const hydrateSchedules = (
  configs: typeof DEFAULT_SCHEDULE_CONFIG,
  t: (key: string) => string,
): NotificationSchedule[] =>
  configs.map((config) => ({
    ...config,
    title: t(`notifications.settings.${config.id}.title`),
    body: t(`notifications.settings.${config.id}.body`),
  }));

const STORAGE_KEY = "bocado_notification_schedules_v2";
const LAST_ACTIVE_KEY = "bocado_last_active";

export const useNotifications = (
  userUid: string | undefined,
): UseNotificationsReturn => {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Store only config data, hydrate with translations when rendering
  const [scheduleConfigs, setScheduleConfigs] = useState<Omit<NotificationSchedule, 'title' | 'body'>[]>(
    DEFAULT_SCHEDULE_CONFIG,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [pendingRatingsCount, setPendingRatingsCount] = useState(0);
  const [daysSinceLastPantryUpdate, setDaysSinceLastPantryUpdate] = useState<number | null>(null);
  const [daysSinceLastAppUse, setDaysSinceLastAppUse] = useState(0);

  const hasLoadedSettingsRef = useRef(false);
  const firestoreSyncedRef = useRef(false);
  const schedulesRef = useRef<NotificationSchedule[]>([]);

  // Hydrate configs with current translations
  const schedules = hydrateSchedules(scheduleConfigs, t);

  // Sync ref with state
  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  // Initial support check
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await areNotificationsSupported();
      setIsSupported(supported);
      if (supported && "Notification" in window) {
        setPermission(Notification.permission);
      }
    };
    checkSupport();
  }, []);

  // Helper to save settings to Firestore
  const saveSettingsToFirestore = useCallback(
    async (updates: Partial<Record<string, any>>) => {
      if (!userUid) return;
      try {
        await setDoc(
          doc(db, "notification_settings", userUid),
          {
            userId: userUid,
            updatedAt: serverTimestamp(),
            ...updates,
          },
          { merge: true },
        );
      } catch (error) {
        logger.warn("Error saving notification settings:", error);
      }
    },
    [userUid],
  );

  // Load settings (Local Storage + Firestore)
  useEffect(() => {
    const loadSettings = async () => {
      // 1. Load from Local Storage first for speed
      const saved = localStorage.getItem(STORAGE_KEY);
      let initialConfigs = [...DEFAULT_SCHEDULE_CONFIG];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          initialConfigs = initialConfigs.map((def) => {
            const found = parsed.find((s: any) => s.id === def.id);
            return found ? { ...def, ...found } : def;
          });
        } catch (e) {
          logger.error("Error parsing local notification schedules:", e);
        }
      }

      setScheduleConfigs(initialConfigs);
      hasLoadedSettingsRef.current = true;

      // 2. Sync with Firestore if user is authenticated
      if (userUid) {
        try {
          const docSnap = await getDoc(doc(db, "notification_settings", userUid));
          if (docSnap.exists()) {
            const data = docSnap.data() as { schedules?: any[] };
            if (Array.isArray(data.schedules)) {
              setScheduleConfigs((prev) => {
                const updated = prev.map((def) => {
                  const saved = data.schedules?.find((s) => s.id === def.id);
                  return saved ? { ...def, ...saved } : def;
                });
                // Mark sync complete AFTER React processes setState to avoid race condition
                setTimeout(() => {
                  firestoreSyncedRef.current = true;
                }, 0);
                return updated;
              });
            } else {
              // No schedules array, mark sync complete
              setTimeout(() => {
                firestoreSyncedRef.current = true;
              }, 0);
            }
          } else {
            // Document doesn't exist, mark sync complete
            setTimeout(() => {
              firestoreSyncedRef.current = true;
            }, 0);
          }
        } catch (error) {
          logger.warn("Error loading notification settings from Firestore:", error);
          // Mark sync complete even on error to unblock save operations
          setTimeout(() => {
            firestoreSyncedRef.current = true;
          }, 0);
        }
      } else {
        // No user, so no Firestore sync needed
        setTimeout(() => {
          firestoreSyncedRef.current = true;
        }, 0);
      }
    };

    loadSettings();
  }, [userUid]);

  // Save to Local Storage on change
  useEffect(() => {
    if (!hasLoadedSettingsRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduleConfigs));
  }, [scheduleConfigs]);

  // Save to Firestore on change (debounced/optimized)
  useEffect(() => {
    if (!userUid || !hasLoadedSettingsRef.current || !firestoreSyncedRef.current) return;

    const timer = setTimeout(() => {
      // Save only configuration, not translated text
      const configToSave = scheduleConfigs.map(({ id, hour, minute, enabled, lastShown }) => ({
        id, hour, minute, enabled, lastShown
      }));
      saveSettingsToFirestore({ schedules: configToSave });
    }, 2000);

    return () => clearTimeout(timer);
  }, [scheduleConfigs, userUid, saveSettingsToFirestore]);

  // Update activity tracking
  useEffect(() => {
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActive) {
      const days = Math.floor(
        (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24),
      );
      setDaysSinceLastAppUse(days);
    }
    localStorage.setItem(LAST_ACTIVE_KEY, new Date().toISOString());

    // Actualizar lastActiveAt en Firestore
    if (userUid) {
      setDoc(
        doc(db, "notification_settings", userUid),
        { lastActiveAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {}); // best-effort
    }
  }, [userUid]);

  // Sync Foreground Messages - register global listener once
  // (The listener itself only registers once globally to avoid duplicates)
  useEffect(() => {
    if (!isSupported) return;
    onForegroundMessage(() => {
      // Callback is no longer used since the listener is registered globally
      // in firebaseConfig.ts to avoid duplicates when multiple components use this hook
    });
  }, [isSupported]);

  // Check conditions for smart notifications
  const checkNotifications = useCallback(() => {
    if (!isSupported || permission !== "granted") return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const today = now.toDateString();

    schedulesRef.current.forEach((schedule) => {
      if (!schedule.enabled) return;

      const scheduleTime = schedule.hour * 60 + schedule.minute;
      const isExactlyTime = currentTime === scheduleTime;

      // Allow a 30-minute window for background sync catch-up if not shown today
      const isWithinWindow = currentTime >= scheduleTime && currentTime <= scheduleTime + 30;

      if (isExactlyTime || isWithinWindow) {
        if (schedule.lastShown && new Date(schedule.lastShown).toDateString() === today) return;

        // Verify conditions
        let shouldShow = true;
        if (schedule.condition === "pantry_empty") {
          shouldShow = daysSinceLastPantryUpdate === null || daysSinceLastPantryUpdate >= 3;
        } else if (schedule.condition === "pending_ratings") {
          shouldShow = pendingRatingsCount > 0;
        } else if (schedule.condition === "inactive_user") {
          shouldShow = daysSinceLastAppUse >= 3;
        }

        // Check frequency limit
        if (shouldShow && schedule.lastShown && schedule.minDaysBetween) {
          const daysSinceLast = Math.floor(
            (now.getTime() - new Date(schedule.lastShown).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLast < schedule.minDaysBetween) shouldShow = false;
        }

        if (shouldShow) {
          new Notification(schedule.title, {
            body: schedule.body,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            tag: schedule.id,
          });

          // Update lastShown locally immediately to prevent double trigger
          setScheduleConfigs(prev => prev.map(s =>
            s.id === schedule.id ? { ...s, lastShown: now.toISOString() } : s
          ));

          trackEvent("notification_shown", { id: schedule.id, type: schedule.type });
        }
      }
    });
  }, [isSupported, permission, daysSinceLastPantryUpdate, pendingRatingsCount, daysSinceLastAppUse]);

  // Backend FCM handles notification sending - client-side polling disabled
  // to prevent duplicate notifications

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      if (fcmToken) {
        setToken(fcmToken);
        setPermission("granted");
        logger.info("Notification permission granted");

        // Guardar token en Firestore para que el servidor pueda enviar notificaciones
        if (userUid) {
          try {
            const tokenId = fcmToken.substring(0, 20);

            // Guardar token en subcolección tokens/
            await setDoc(
              doc(db, "notification_settings", userUid, "tokens", tokenId),
              {
                token: fcmToken,
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            // Actualizar documento principal con hasToken: true
            await setDoc(
              doc(db, "notification_settings", userUid),
              {
                userId: userUid,
                hasToken: true,
                tokenUpdatedAt: serverTimestamp(),
                lastActiveAt: serverTimestamp(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              { merge: true }
            );

            logger.info("Token FCM guardado en Firestore");
          } catch (error) {
            logger.warn("Error guardando token FCM en Firestore:", error);
            // No bloquear — el permiso sí se obtuvo
          }
        }

        return true;
      }
      setPermission(Notification.permission);
      return false;
    } catch (error) {
      logger.error("Error requesting permission:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userUid]);

  const updateSchedule = useCallback((id: string, updates: Partial<NotificationSchedule>) => {
    // Only update config fields, ignore title/body translations
    const configUpdates = (({ title, body, ...rest }) => rest)(updates);
    setScheduleConfigs((prev) => prev.map((s) => (s.id === id ? { ...s, ...configUpdates } : s)));
    trackEvent("notification_schedule_updated", { id, ...configUpdates });
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setScheduleConfigs((prev) => prev.map((s) => {
      if (s.id === id) {
        const newEnabled = !s.enabled;
        trackEvent("notification_schedule_toggled", { id, enabled: newEnabled });
        // Fix: Don't reset lastShown when toggling
        return { ...s, enabled: newEnabled };
      }
      return s;
    }));
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!isSupported || permission !== "granted") return false;
    new Notification(t("notifications.settings.testNotification.title"), {
      body: t("notifications.settings.testNotification.body"),
      icon: "/icons/icon-192x192.png",
    });
    return true;
  }, [isSupported, permission, t]);

  return {
    isSupported,
    permission,
    token,
    schedules,
    isLoading,
    requestPermission,
    updateSchedule,
    toggleSchedule,
    checkAndShowNotifications: checkNotifications,
    sendTestNotification,
    pendingRatingsCount,
    daysSinceLastPantryUpdate,
    daysSinceLastAppUse,
    lastMessage,
  };
};
