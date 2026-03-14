import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Clock, CheckCircle } from "./icons";
import { trackEvent } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";
import { useNotifications } from "../hooks/useNotifications";

interface NotificationOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  userUid: string;
}

type Step = "welcome" | "meals" | "done";

export const NotificationOnboarding: React.FC<NotificationOnboardingProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  userUid,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("welcome");
  const { schedules: reminders } = useNotifications(userUid);

  if (!isOpen) return null;

  const mealReminders = reminders.filter((r) => r.type === "meal");

  const handleNext = () => {
    if (step === "welcome") {
      setStep("meals");
      trackEvent("notification_onboarding_step", { step: "meals" });
    } else if (step === "meals") {
      setStep("done");
      trackEvent("notification_onboarding_step", { step: "done" });
    }
  };

  const handleComplete = () => {
    trackEvent("notification_onboarding_completed");
    onClose();
  };

  const handleMoreSettings = () => {
    trackEvent("notification_onboarding_open_settings");
    onClose();
    if (onOpenSettings) {
      setTimeout(onOpenSettings, 300);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 pt-safe pb-safe"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleComplete();
      }}
    >
      <div
        className="bg-white w-full sm:w-full sm:max-w-md md:max-w-lg lg:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-fade-in flex flex-col shadow-bocado-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "min(90vh, 800px)" }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-bocado-border flex-shrink-0">
          <div
            className={`h-full bg-bocado-green transition-all duration-300 ${
              step === "welcome"
                ? "w-1/3"
                : step === "meals"
                  ? "w-2/3"
                  : "w-full"
            }`}
          />
        </div>

        {/* Content - Scrolleable */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-8 flex flex-col justify-between min-h-0">
            {/* Welcome Step */}
            {step === "welcome" && (
              <div className="flex flex-col justify-between gap-6">
                <div className="text-center space-y-4 sm:space-y-6">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-bocado-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-bocado-green" />
                    </div>
                  </div>

                  {/* Title y Descripción */}
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-bocado-dark-green mb-2 px-2">
                      {t("notifications.onboarding.welcome.title")}
                    </h1>
                    <p className="text-xs sm:text-sm text-bocado-gray leading-relaxed px-2">
                      {t("notifications.onboarding.welcome.description")}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="bg-bocado-background rounded-2xl p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
                  {[
                    {
                      emoji: "🌅",
                      key: "feature1",
                    },
                    {
                      emoji: "⏰",
                      key: "feature2",
                    },
                    {
                      emoji: "✨",
                      key: "feature3",
                    },
                  ].map((feat) => (
                    <div key={feat.key} className="flex items-start gap-3">
                      <span className="text-lg sm:text-2xl flex-shrink-0">
                        {feat.emoji}
                      </span>
                      <div className="text-left min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-bocado-text leading-snug">
                          {t(`notifications.onboarding.${feat.key}.title`)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-bocado-gray leading-snug">
                          {t(`notifications.onboarding.${feat.key}.desc`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meals Step */}
            {step === "meals" && (
              <div className="flex flex-col justify-between gap-4 sm:gap-6">
                {/* Title */}
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-bocado-dark-green mb-1 sm:mb-2 px-2">
                    {t("notifications.onboarding.meals.title")}
                  </h1>
                  <p className="text-xs sm:text-sm text-bocado-gray px-2 leading-relaxed">
                    {t("notifications.onboarding.meals.description")}
                  </p>
                </div>

                {/* Meal cards */}
                <div className="space-y-2 sm:space-y-3">
                  {mealReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="bg-bocado-background rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-bocado-border/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="text-lg sm:text-2xl flex-shrink-0">
                          {reminder.id === "breakfast"
                            ? "🌅"
                            : reminder.id === "lunch"
                              ? "🍽️"
                              : "🌙"}
                        </span>
                        <div className="text-left min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-bocado-text truncate">
                            {reminder.title.replace(/(🌅|🍽️|🌙)/g, "").trim()}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-bocado-gray">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="tabular-nums">
                              {String(reminder.hour).padStart(2, "0")}:
                              {String(reminder.minute).padStart(2, "0")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl flex-shrink-0 font-bold">
                        {reminder.enabled ? "✓" : "○"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hint */}
                <p className="text-[10px] sm:text-xs text-bocado-gray text-center italic px-2">
                  {t("notifications.onboarding.meals.customize")}
                </p>
              </div>
            )}

            {/* Done Step */}
            {step === "done" && (
              <div className="flex flex-col justify-between gap-4 sm:gap-6">
                {/* Success Icon */}
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-bocado-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-bocado-green" />
                    </div>
                  </div>

                  {/* Title y Mensaje */}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-bocado-dark-green mb-2 px-2">
                    {t("notifications.onboarding.done.title")}
                  </h1>
                  <p className="text-xs sm:text-sm text-bocado-gray leading-relaxed px-2">
                    {t("notifications.onboarding.done.description")}
                  </p>
                </div>

                {/* Tip Card */}
                <div className="bg-bocado-green/5 rounded-2xl p-3 sm:p-4 border border-bocado-green/20">
                  <p className="text-xs sm:text-sm font-semibold text-bocado-dark-green mb-1">
                    💡 {t("notifications.onboarding.done.tip")}
                  </p>
                  <p className="text-[10px] sm:text-xs text-bocado-green leading-relaxed">
                    {t("notifications.onboarding.done.tipDesc")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Buttons - Fixed at bottom */}
          <div className="bg-white border-t border-bocado-border px-4 sm:px-6 md:px-8 py-4 space-y-2 flex-shrink-0">
            {step !== "done" ? (
              <>
                <button
                  onClick={handleNext}
                  className="w-full bg-bocado-green text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-full hover:bg-bocado-green-hover active:scale-95 transition-all"
                >
                  {t("notifications.onboarding.next")} →
                </button>
                <button
                  onClick={handleComplete}
                  className="w-full text-bocado-green font-semibold py-2.5 sm:py-3 text-sm sm:text-base rounded-full hover:bg-bocado-background active:scale-95 transition-colors"
                >
                  {t("notifications.onboarding.skip")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleComplete}
                  className="w-full bg-bocado-green text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base rounded-full hover:bg-bocado-green-hover active:scale-95 transition-all"
                >
                  {t("notifications.onboarding.done.cta")}
                </button>
                <button
                  onClick={handleMoreSettings}
                  className="w-full text-bocado-green font-semibold py-2.5 sm:py-3 text-sm sm:text-base rounded-full hover:bg-bocado-background active:scale-95 transition-colors"
                >
                  {t("notifications.onboarding.done.customize")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NotificationOnboarding;
