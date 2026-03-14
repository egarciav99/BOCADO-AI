import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCircle } from "./icons";
import { trackEvent } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";
import { useNotifications } from "../hooks/useNotifications";

interface NotificationOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  userUid: string;
}

type Step = "times" | "done";

export const NotificationOnboarding: React.FC<NotificationOnboardingProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  userUid,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("times");
  const { schedules: reminders } = useNotifications(userUid);

  if (!isOpen) return null;

  const mealReminders = reminders.filter((r) => r.type === "meal");

  const handleNext = () => {
    if (step === "times") {
      setStep("done");
      trackEvent("notification_onboarding_complete_times");
    }
  };

  const handleClose = () => {
    trackEvent("notification_onboarding_closed");
    onClose();
  };

  const handleOpenSettings = () => {
    trackEvent("notification_onboarding_open_settings");
    handleClose();
    if (onOpenSettings) {
      setTimeout(onOpenSettings, 300);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 pt-safe pb-safe"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contenido simplificado */}
        <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
          {step === "times" && (
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <Bell className="w-12 h-12 text-bocado-green" />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-bocado-dark-green">
                  {t("notifications.onboarding.meals.title")}
                </h1>
              </div>

              {/* Meal times - Minimal display */}
              <div className="space-y-2">
                {mealReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="bg-bocado-background rounded-lg p-3 flex justify-between items-center"
                  >
                    <span className="text-lg">
                      {reminder.id === "breakfast"
                        ? "🌅"
                        : reminder.id === "lunch"
                          ? "🍽️"
                          : "🌙"}
                    </span>
                    <span className="text-sm font-mono text-bocado-dark-green font-bold">
                      {String(reminder.hour).padStart(2, "0")}:
                      {String(reminder.minute).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-bocado-gray">
                💡 {t("notifications.onboarding.meals.customize")}
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-6">
              {/* Success icon */}
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-bocado-green" />
              </div>

              {/* Done message */}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-bocado-dark-green mb-2">
                  {t("notifications.onboarding.done.title")}
                </h1>
                <p className="text-xs sm:text-sm text-bocado-gray">
                  {t("notifications.onboarding.done.description")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons - Sticky footer */}
        <div className="bg-white border-t border-bocado-border px-4 sm:px-6 py-3 space-y-2 flex-shrink-0">
          {step === "times" ? (
            <>
              <button
                onClick={handleNext}
                className="w-full bg-bocado-green text-white font-bold py-2.5 sm:py-3 text-sm rounded-full hover:bg-bocado-green-hover active:scale-95 transition-all"
              >
                Continuar
              </button>
              <button
                onClick={handleClose}
                className="w-full text-bocado-green font-semibold py-2.5 text-xs rounded-full hover:bg-bocado-background"
              >
                Después
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="w-full bg-bocado-green text-white font-bold py-2.5 sm:py-3 text-sm rounded-full hover:bg-bocado-green-hover active:scale-95 transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleOpenSettings}
                className="w-full text-bocado-green font-semibold py-2.5 text-xs rounded-full hover:bg-bocado-background"
              >
                Personalizar todo
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NotificationOnboarding;
