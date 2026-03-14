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
  const { schedules: reminders, updateSchedule } = useNotifications(userUid);

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pt-safe pb-safe overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleComplete();
      }}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-bocado-border">
          <div
            className={`h-full bg-bocado-green transition-all ${
              step === "welcome"
                ? "w-1/3"
                : step === "meals"
                  ? "w-2/3"
                  : "w-full"
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          {step === "welcome" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-bocado-green/10 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-10 h-10 text-bocado-green" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-bocado-dark-green mb-2">
                  {t("notifications.onboarding.welcome.title")}
                </h1>
                <p className="text-sm text-bocado-gray leading-relaxed">
                  {t("notifications.onboarding.welcome.description")}
                </p>
              </div>

              <div className="bg-bocado-background rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🌅</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-bocado-text">
                      {t("notifications.onboarding.feature1.title")}
                    </p>
                    <p className="text-xs text-bocado-gray">
                      {t("notifications.onboarding.feature1.desc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">⏰</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-bocado-text">
                      {t("notifications.onboarding.feature2.title")}
                    </p>
                    <p className="text-xs text-bocado-gray">
                      {t("notifications.onboarding.feature2.desc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">✨</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-bocado-text">
                      {t("notifications.onboarding.feature3.title")}
                    </p>
                    <p className="text-xs text-bocado-gray">
                      {t("notifications.onboarding.feature3.desc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "meals" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-bocado-dark-green mb-2">
                  {t("notifications.onboarding.meals.title")}
                </h1>
                <p className="text-sm text-bocado-gray">
                  {t("notifications.onboarding.meals.description")}
                </p>
              </div>

              <div className="space-y-3">
                {mealReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="bg-bocado-background rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {reminder.id === "breakfast"
                          ? "🌅"
                          : reminder.id === "lunch"
                            ? "🍽️"
                            : "🌙"}
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-bocado-text">
                          {reminder.title.replace(/(🌅|🍽️|🌙)/g, "").trim()}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-bocado-gray">
                          <Clock className="w-3 h-3" />
                          {String(reminder.hour).padStart(2, "0")}:
                          {String(reminder.minute).padStart(2, "0")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl">
                      {reminder.enabled ? "✓" : "○"}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-bocado-gray text-center">
                {t("notifications.onboarding.meals.customize")}
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-bocado-green/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-bocado-green" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-bocado-dark-green mb-2">
                  {t("notifications.onboarding.done.title")}
                </h1>
                <p className="text-sm text-bocado-gray leading-relaxed">
                  {t("notifications.onboarding.done.description")}
                </p>
              </div>

              <div className="bg-bocado-green/5 rounded-2xl p-4 border border-bocado-green/20">
                <p className="text-sm font-semibold text-bocado-dark-green mb-2">
                  💡 {t("notifications.onboarding.done.tip")}
                </p>
                <p className="text-xs text-bocado-green">
                  {t("notifications.onboarding.done.tipDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3 mt-6">
            {step !== "done" ? (
              <>
                <button
                  onClick={handleNext}
                  className="w-full bg-bocado-green text-white font-bold py-3 rounded-full hover:bg-bocado-green-hover transition-colors"
                >
                  {t("notifications.onboarding.next")} →
                </button>
                <button
                  onClick={handleComplete}
                  className="w-full text-bocado-green font-semibold py-3 rounded-full hover:bg-bocado-background transition-colors"
                >
                  {t("notifications.onboarding.skip")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleComplete}
                  className="w-full bg-bocado-green text-white font-bold py-3 rounded-full hover:bg-bocado-green-hover transition-colors"
                >
                  {t("notifications.onboarding.done.cta")}
                </button>
                <button
                  onClick={handleMoreSettings}
                  className="w-full text-bocado-green font-semibold py-3 rounded-full hover:bg-bocado-background transition-colors"
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
