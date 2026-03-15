import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "./icons";
import { trackEvent } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";

interface NotificationOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const NotificationOnboarding: React.FC<NotificationOnboardingProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const mealTimes = [
    { emoji: "🌅", name: "Desayuno", time: "08:00" },
    { emoji: "🍽️", name: "Almuerzo", time: "13:30" },
    { emoji: "🌙", name: "Cena", time: "19:30" },
  ];

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
        className="bg-white w-full sm:rounded-3xl rounded-t-3xl max-w-sm overflow-hidden flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <Bell className="w-10 sm:w-12 h-10 sm:h-12 text-bocado-green" />
          </div>

          {/* Title */}
          <h1 className="text-base sm:text-lg font-bold text-bocado-dark-green text-center">
            ¡Notificaciones activadas! 🎉
          </h1>

          {/* Meal times preview */}
          <div className="bg-bocado-background rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-bocado-gray text-center mb-3">
              Recibirás sugerencias a estas horas:
            </p>
            {mealTimes.map((meal) => (
              <div key={meal.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{meal.emoji}</span>
                  <span className="text-sm font-medium text-bocado-text">
                    {meal.name}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-bocado-dark-green bg-white px-2.5 py-1 rounded-full">
                  {meal.time}
                </span>
              </div>
            ))}
          </div>

          {/* Info */}
          <p className="text-xs text-bocado-gray text-center">
            💡 Puedes cambiar estos horarios en <strong>Perfil → Notificaciones</strong>
          </p>
        </div>

        {/* Action buttons */}
        <div className="bg-white border-t border-bocado-border px-4 sm:px-6 py-3 space-y-2 flex-shrink-0">
          <button
            onClick={handleOpenSettings}
            className="w-full bg-bocado-green text-white font-bold py-2.5 sm:py-3 text-sm rounded-full hover:bg-bocado-dark-green active:scale-95 transition-all"
          >
            Personalizar ahora
          </button>
          <button
            onClick={handleClose}
            className="w-full text-bocado-green font-semibold py-2 text-xs rounded-full hover:bg-bocado-background transition-colors"
          >
            Después
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default NotificationOnboarding;
