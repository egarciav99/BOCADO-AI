import React from "react";
import BocadoLogo from "./BocadoLogo";
import { trackEvent, auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { useAuthStore } from "../stores/authStore";
import { useUserProfile } from "../hooks/useUser";
import { useTranslation } from "../contexts/I18nContext";
import { logger } from "../utils/logger";
import {
  getProfileCompleteness,
  getMissingProfileFields,
} from "../utils/profileValidation";

interface CompleteProfileScreenProps {
  onStartCompletion: () => void;
  onLogout: () => void;
}

/**
 * Pantalla que se muestra cuando un usuario está autenticado
 * pero su perfil está incompleto (falta información)
 * 
 * Casos:
 * 1. Usuario se registró con Google pero no completó los datos
 * 2. Usuario fue a RegisterFlow Step 1 pero no terminó
 * 3. Usuario cierra la app a mitad del registro
 */
const CompleteProfileScreen: React.FC<CompleteProfileScreenProps> = ({
  onStartCompletion,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: profile } = useUserProfile(user?.uid);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const completeness = getProfileCompleteness(profile);
  const missingFields = getMissingProfileFields(profile);

  const handleCompleteProfile = () => {
    trackEvent("complete_profile_clicked", {
      userId: user?.uid,
      completeness,
      missingFieldsCount: missingFields.length,
    });
    onStartCompletion();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      trackEvent("complete_profile_logout_clicked", {
        userId: user?.uid,
        completeness,
      });
      await signOut(auth);
      onLogout();
    } catch (error) {
      logger.error("Error logging out:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto flex items-center justify-center px-4 py-8 pt-safe pb-safe bg-gradient-to-b from-bocado-cream to-white dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-bocado w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-40 mx-auto mb-4">
            <BocadoLogo className="w-full" />
          </div>
          <h1 className="text-2xl font-bold text-bocado-dark-green dark:text-gray-200 mb-2">
            {t("completeProfile.title") || "Completa tu Perfil"}
          </h1>
          <p className="text-sm text-bocado-gray dark:text-gray-400">
            {t("completeProfile.subtitle") ||
              "Necesitamos un poco más de información para personalizar tu experiencia"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-bocado-dark-gray dark:text-gray-300 uppercase tracking-wider">
              {t("completeProfile.progress") || "Progreso"}
            </span>
            <span className="text-xs font-bold text-bocado-green">
              {completeness}%
            </span>
          </div>
          <div className="w-full h-3 bg-bocado-background dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-bocado-green to-bocado-orange transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Missing Fields */}
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-4">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
            <span className="text-lg">ℹ️</span>
            {t("completeProfile.missingFieldsCount") ||
              `Faltan ${missingFields.length} campo(s)`}
          </p>
          <ul className="space-y-2">
            {missingFields.slice(0, 5).map((field) => (
              <li
                key={field}
                className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300"
              >
                <span className="text-xl">📝</span>
                <span className="capitalize">
                  {t(`form.fields.${field}`) || field}
                </span>
              </li>
            ))}
            {missingFields.length > 5 && (
              <li className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                +{missingFields.length - 5} más
              </li>
            )}
          </ul>
        </div>

        {/* Info Message */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {t("completeProfile.info") ||
              "Con esta información podemos darte recomendaciones personalizadas de comidas y planes nutricionales adaptados a ti."}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCompleteProfile}
            className="w-full bg-bocado-green text-white font-bold py-4 px-6 rounded-full text-base shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all duration-200 hover:scale-[1.02]"
          >
            {t("completeProfile.continueButton") || "Completar Perfil"}
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full bg-white dark:bg-gray-700 text-bocado-green dark:text-bocado-green-light border-2 border-bocado-green font-bold py-3 px-6 rounded-full text-base hover:bg-bocado-background dark:hover:bg-gray-600 active:scale-95 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut
              ? t("common.loading") || "Cargando..."
              : t("completeProfile.logoutButton") || "Cerrar Sesión"}
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-6 pt-4 border-t border-bocado-border dark:border-gray-700">
          <p className="text-xs text-bocado-gray dark:text-gray-500 text-center">
            {t("completeProfile.footer") ||
              "Tu información está segura y protegida por encriptación."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfileScreen;
