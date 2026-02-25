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

const createDefaultSchedules = (
  t: (key: string) => string,
): NotificationSchedule[] => [
    // Recordatorios de comidas
    {
      id: "breakfast",
      type: "meal",
      title: t("notifications.settings.breakfast.title"),
      body: t("notifications.settings.breakfast.body"),
      hour: 8,
      minute: 0,
      enabled: true,
      condition: "always",
      minDaysBetween: 1,
    },
    {
      id: "lunch",
      type: "meal",
      title: t("notifications.settings.lunch.title"),
      body: t("notifications.settings.lunch.body"),
      hour: 13,
      minute: 30,
      enabled: true,
      condition: "always",
      minDaysBetween: 1,
    },
    {
      id: "dinner",
      type: "meal",
      title: t("notifications.settings.dinner.title"),
      body: t("notifications.settings.dinner.body"),
      hour: 19,
      minute: 30,
      enabled: true,
      condition: "always",
      minDaysBetween: 1,
    },
    // Recordatorios inteligentes
    {
      id: "pantry_update",
      type: "pantry",
      title: t("notifications.settings.pantryUpdate.title"),
      body: t("notifications.settings.pantryUpdate.body"),
      hour: 10,
      minute: 0,
      enabled: true,
      condition: "pantry_empty",
      minDaysBetween: 3,
    },
    {
      id: "rate_recipes",
      type: "rating",
      title: t("notifications.settings.rateRecipes.title"),
      body: t("notifications.settings.rateRecipes.body"),
      hour: 15,
      minute: 0,
      enabled: true,
      condition: "pending_ratings",
      minDaysBetween: 2,
    },
    {
      id: "come_back",
      type: "engagement",
      title: t("notifications.settings.comeBack.title"),
      body: t("notifications.settings.comeBack.body"),
      hour: 12,
      minute: 0,
      enabled: true,
      condition: "inactive_user",
      minDaysBetween: 7,
    },
  ];

const STORAGE_KEY = "bocado_notification_schedules_v2";
const LAST_ACTIVE_KEY = "bocado_last_active";
const RATINGS_SHOWN_KEY = "bocado_ratings_shown";

// Threshold constants
const MIN_PANTRY_ITEMS = 3;
const PANTRY_STALE_DAYS = 7;
const EXPECTED_RATINGS = 3;

export const useNotifications = (
  userUid: string | undefined,
): UseNotificationsReturn => {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<NotificationSchedule[]>(() =>
    createDefaultSchedules(t),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [pendingRatingsCount, setPendingRatingsCount] = useState(0);
  const [daysSinceLastPantryUpdate, setDaysSinceLastPantryUpdate] = useState<number | null>(null);
  const [daysSinceLastAppUse, setDaysSinceLastAppUse] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedSettingsRef = useRef(false);
  const schedulesRef = useRef<NotificationSchedule[]>([]);

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
      let initialSchedules = createDefaultSchedules(t);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          initialSchedules = initialSchedules.map((def) => {
            const found = parsed.find((s: NotificationSchedule) => s.id === def.id);
            return found ? { ...def, ...found } : def;
          });
        } catch (e) {
          logger.error("Error parsing local notification schedules:", e);
        }
      }

      setSchedules(initialSchedules);

      // 2. Sync with Firestore if user is authenticated
      if (userUid) {
        try {
          const docSnap = await getDoc(doc(db, "notification_settings", userUid));
          if (docSnap.exists()) {
            const data = docSnap.data() as { schedules?: any[] };
            if (Array.isArray(data.schedules)) {
              setSchedules((prev) =>
                prev.map((def) => {
                  const saved = data.schedules?.find((s) => s.id === def.id);
                  return saved ? { ...def, ...saved } : def;
                })
              );
            }
          }
        } catch (error) {
          logger.warn("Error loading notification settings from Firestore:", error);
        }
      }

      hasLoadedSettingsRef.current = true;
    };

    loadSettings();
  }, [userUid, t]);

  // Save to Local Storage on change
  useEffect(() => {
    if (!hasLoadedSettingsRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  }, [schedules]);

  // Save to Firestore on change (debounced/optimized)
  useEffect(() => {
    if (!userUid || !hasLoadedSettingsRef.current) return;

    const timer = setTimeout(() => {
      // Save only configuration, not translated text
      const configToSave = schedules.map(({ id, hour, minute, enabled, lastShown }) => ({
        id, hour, minute, enabled, lastShown
      }));
      saveSettingsToFirestore({ schedules: configToSave });
    }, 2000);

    return () => clearTimeout(timer);
  }, [schedules, userUid, saveSettingsToFirestore]);

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
  }, []);

  // Sync Foreground Messages
  useEffect(() => {
    if (!isSupported) return;
    return onForegroundMessage((payload) => {
      setLastMessage(payload);
      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || t("notifications.appName"), {
          body: payload.notification?.body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        });
      }
    });
  }, [isSupported, t]);

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
          setSchedules(prev => prev.map(s =>
            s.id === schedule.id ? { ...s, lastShown: now.toISOString() } : s
          ));

          trackEvent("notification_shown", { id: schedule.id, type: schedule.type });
        }
      }
    });
  }, [isSupported, permission, daysSinceLastPantryUpdate, pendingRatingsCount, daysSinceLastAppUse]);

  // Interval Loop
  useEffect(() => {
    if (!isSupported || permission !== "granted") return;
    intervalRef.current = setInterval(checkNotifications, 60000);
    checkNotifications();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSupported, permission, checkNotifications]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      if (fcmToken) {
        setToken(fcmToken);
        setPermission("granted");
        logger.info("Notification permission granted");
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
  }, [isSupported]);

  const updateSchedule = useCallback((id: string, updates: Partial<NotificationSchedule>) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    trackEvent("notification_schedule_updated", { id, ...updates });
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setSchedules((prev) => prev.map((s) => {
      if (s.id === id) {
        const newEnabled = !s.enabled;
        trackEvent("notification_schedule_toggled", { id, enabled: newEnabled });
        return { ...s, enabled: newEnabled, lastShown: newEnabled ? undefined : s.lastShown };
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
