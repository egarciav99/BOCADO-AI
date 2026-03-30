import React, { useState, useMemo } from "react";
import { trackEvent } from "../firebaseConfig";
import { Lock, ShieldCheck, Eye, Trash2 } from "./icons";
import { useTranslation } from "../contexts/I18nContext";

interface PermissionsScreenProps {
  onAccept: () => void;
  onGoHome: () => void;
}

const PermissionsScreen: React.FC<PermissionsScreenProps> = ({
  onAccept,
  onGoHome,
}) => {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAccept = () => {
    trackEvent("accept_privacy_policy", {
      timestamp: new Date().toISOString(),
      screen: "permissions",
    });
    onAccept();
  };

  const handleGoHome = () => {
    trackEvent("reject_privacy_policy", {
      timestamp: new Date().toISOString(),
      screen: "permissions",
    });
    onGoHome();
  };

  // ✅ FIX: memoizado para no recrear en cada render
  const dataItems = useMemo(() => [
    {
      icon: "📊",
      label: t("permissions.dataTypes.profile.title"),
      desc: t("permissions.dataTypes.profile.description"),
    },
    {
      icon: "🍎",
      label: t("permissions.dataTypes.preferences.title"),
      desc: t("permissions.dataTypes.preferences.description"),
    },
    {
      icon: "📍",
      label: t("permissions.dataTypes.location.title"),
      desc: t("permissions.dataTypes.location.description"),
    },
  ], [t]);

  const benefits = useMemo(() => [
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      text: t("permissions.benefits.noSell"),
    },
    {
      icon: <Eye className="w-5 h-5" />,
      text: t("permissions.benefits.download"),
    },
    {
      icon: <Trash2 className="w-5 h-5" />,
      text: t("permissions.benefits.delete"),
    },
  ], [t]);

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto px-4 py-8 pt-safe pb-safe">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-bocado w-full max-w-sm animate-fade-in mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-bocado-green/20 to-bocado-green/5 dark:from-bocado-green/30 dark:to-bocado-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-8 h-8 text-bocado-green" />
          </div>
          <h1 className="text-2xl font-bold text-bocado-dark-green dark:text-green-300 mb-2">
            {t("permissions.title")}
          </h1>
          <p className="text-sm text-bocado-gray dark:text-gray-400">
            {t("permissions.subtitle")}
          </p>
        </div>

        {/* Qué datos usamos */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-bocado-dark-gray dark:text-gray-300 uppercase tracking-wider mb-3">
            {t("permissions.whatWeUse")}
          </h2>
          <div className="space-y-2">
            {dataItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-bocado-background/50 dark:bg-gray-700/50 rounded-xl"
              >
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-bocado-text dark:text-gray-200">
                    {item.label}
                  </p>
                  <p className="text-xs text-bocado-gray dark:text-gray-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tus derechos */}
        <div className="mb-5">
          <h2 className="text-xs font-bold text-bocado-dark-gray dark:text-gray-300 uppercase tracking-wider mb-3">
            {t("permissions.control")}
          </h2>
          <div className="space-y-2">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-sm text-bocado-text dark:text-gray-200"
              >
                <span className="text-bocado-green mt-0.5 flex-shrink-0">
                  {benefit.icon}
                </span>
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expandible */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-xs text-bocado-green font-medium mb-5 hover:underline flex items-center justify-center gap-1"
        >
          {showDetails ? t("permissions.showLess") : t("permissions.showMore")}
          <span
            className={`transform transition-transform ${showDetails ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </button>

        {showDetails && (
          <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs text-bocado-gray dark:text-gray-400 space-y-2 animate-fade-in">
            <p>{t("permissions.details.responsible")}</p>
            <p>{t("permissions.details.purpose")}</p>
            <p>{t("permissions.details.legitimation")}</p>
            <p>{t("permissions.details.storage")}</p>
            <p>{t("permissions.details.rights")}</p>
          </div>
        )}

        {/* ✅ FIX: checkbox semántico con input real y label asociado */}
        <div
          className={`mb-5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            agreed
              ? "border-bocado-green bg-bocado-green/5"
              : "border-bocado-border dark:border-gray-600 hover:border-bocado-green/50"
          }`}
          onClick={() => setAgreed(!agreed)}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                agreed
                  ? "bg-bocado-green border-bocado-green"
                  : "border-bocado-border dark:border-gray-500"
              }`}
              aria-hidden="true"
            >
              {agreed && (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            {/* ✅ FIX: input real oculto para accesibilidad semántica */}
            <label
              htmlFor="consent-checkbox"
              className="text-sm text-bocado-text dark:text-gray-200 leading-relaxed select-none cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                id="consent-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              {t("permissions.consent")}
            </label>
          </div>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={!agreed}
            className="w-full bg-bocado-green text-white font-bold py-3.5 px-6 rounded-full text-sm shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all disabled:bg-bocado-gray/50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            <span>{t("permissions.continue")}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
          <button
            onClick={handleGoHome}
            className="w-full bg-white dark:bg-gray-700 border-2 border-bocado-border dark:border-gray-600 text-bocado-gray dark:text-gray-300 font-semibold py-3 px-6 rounded-full text-sm hover:border-bocado-dark-gray hover:text-bocado-dark-gray dark:hover:text-gray-200 transition-all"
          >
            {t("permissions.decline")}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-1 text-xs text-bocado-gray dark:text-gray-500">
          <ShieldCheck className="w-4 h-4 text-bocado-green" />
          <span>{t("permissions.footer")}</span>
        </div>
      </div>
    </div>
  );
};

export default PermissionsScreen;