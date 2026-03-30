import React, { useState } from "react";
import BocadoLogo from "./BocadoLogo";
import { trackEvent } from "../firebaseConfig";
import { signInWithGoogle } from "../services/authService";
import { logger } from "../utils/logger";
import { useTranslation } from "../contexts/I18nContext";

interface RegistrationMethodScreenProps {
  onGoogleSuccess: (uid: string, email: string | null) => void;
  onChooseEmail: () => void;
  onGoHome: () => void;
}

const RegistrationMethodScreen: React.FC<RegistrationMethodScreenProps> = ({
  onGoogleSuccess,
  onChooseEmail,
  onGoHome,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signInWithGoogle();

      trackEvent("registration_google_initiated", {
        userId: result.uid,
        isNewUser: result.isNewUser,
      });

      if (!result.isNewUser) {
        // Usuario ya existe
        setError(t("registration.errors.alreadyRegistered"));
        setIsLoading(false);
        return;
      }

      // Usuario nuevo - continuar al flujo de registro
      onGoogleSuccess(result.uid, result.email);
    } catch (err: any) {
      logger.error("Error con Google Sign-In:", err.code);
      trackEvent("registration_google_error", {
        error_code: err.code || "unknown",
      });

      if (err.code === "auth/popup-closed-by-user") {
        setError(t("registration.errors.cancelled"));
      } else if (err.code === "auth/network-request-failed") {
        setError(t("registration.errors.network"));
      } else {
        setError(t("registration.errors.googleGeneric"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChoice = () => {
    trackEvent("registration_method_email_selected");
    onChooseEmail();
  };

  const handleGoBack = () => {
    trackEvent("registration_method_go_home");
    onGoHome();
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-8 pt-safe pb-safe">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-bocado w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-40 mx-auto mb-2">
            <BocadoLogo className="w-full" />
          </div>
          <h1 className="text-xl font-bold text-bocado-dark-green dark:text-green-300">
            {t("registration.title") || "Crear cuenta"}
          </h1>
          <p className="text-sm text-bocado-gray dark:text-gray-400 mt-1">
            {t("registration.subtitle") || "Elige cómo quieres registrarte"}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            aria-label={t("registration.continueWithGoogle") || "Continuar con Google"}
            className="w-full bg-white dark:bg-gray-700 border-2 border-bocado-border dark:border-gray-600 text-bocado-text dark:text-gray-200 font-bold py-3 px-4 rounded-full text-base shadow-sm hover:bg-bocado-background dark:hover:bg-gray-600 hover:border-bocado-dark-gray active:scale-95 transition-all disabled:bg-bocado-gray disabled:text-white flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-bocado-border border-t-bocado-dark-gray rounded-full animate-spin" />
                {t("common.loading")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t("registration.continueWithGoogle") || "Continuar con Google"}
              </span>
            )}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-bocado-border dark:bg-gray-700"></div>
            <span className="text-xs text-bocado-gray dark:text-gray-500 font-medium">{t("common.or")}</span>
            <div className="flex-1 h-px bg-bocado-border dark:bg-gray-700"></div>
          </div>

          <button
            onClick={handleEmailChoice}
            disabled={isLoading}
            className="w-full bg-bocado-green text-white font-bold py-3 px-4 rounded-full text-base shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all disabled:bg-bocado-gray"
          >
            {t("registration.continueWithEmail") || "Continuar con Email"}
          </button>
        </div>

        {error && (
          <p className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg mt-4">
            {error}
          </p>
        )}

        <div className="mt-6 text-center pt-4 border-t border-bocado-border dark:border-gray-700">
          <button
            onClick={handleGoBack}
            className="text-xs text-bocado-gray dark:text-gray-400 hover:text-bocado-dark-gray dark:hover:text-gray-300 transition-colors"
          >
            {t("home.backToHome") || "Volver al inicio"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationMethodScreen;
