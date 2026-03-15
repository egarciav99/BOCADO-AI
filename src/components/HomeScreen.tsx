import React from "react";
import BocadoLogo from "./BocadoLogo";
import { signOut } from "firebase/auth";
import { auth, trackEvent } from "../firebaseConfig";
import { useAuthStore } from "../stores/authStore";
import { useUserProfile } from "../hooks/useUser";
import { logger } from "../utils/logger";
import { useTranslation } from "../contexts/I18nContext";
import { clearSessionData } from "../utils/sessionPersistence";
import { isProfileComplete } from "../utils/profileValidation";

interface HomeScreenProps {
  onStartRegistration: () => void;
  onGoToApp: () => void;
  onGoToLogin: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartRegistration,
  onGoToApp,
  onGoToLogin,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.uid);
  const { t, locale, setLocale } = useTranslation();

  // ✅ FIX: hasSession debe ser true SOLO si:
  // 1. Usuario está autenticado en Firebase
  // 2. El perfil ya cargó (no en loading)
  // 3. El perfil está COMPLETO
  const hasCompleteProfile = !profileLoading && isProfileComplete(profile);
  const hasSession = isAuthenticated && hasCompleteProfile;

  // Mostrar loading mientras se verifica el perfil
  if (isAuthenticated && profileLoading) {
    return (
      <div className="h-full flex items-center justify-center px-4 py-8 pt-safe pb-safe bg-gradient-to-b from-bocado-cream to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-40 mx-auto mb-6">
            <BocadoLogo className="w-full" />
          </div>
          <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-bocado-green font-bold animate-pulse">
            {t("common.loading") || "Cargando..."}
          </p>
        </div>
      </div>
    );
  }

  // --- HANDLERS CON ANALÍTICA ---

  const handleEnterApp = () => {
    trackEvent("home_enter_app", { userId: user?.uid }); // ✅ Analítica
    onGoToApp();
  };

  const handleStartRegistration = () => {
    trackEvent("home_start_registration"); // ✅ Analítica
    onStartRegistration();
  };

  const handleGoToLogin = () => {
    trackEvent("home_go_to_login"); // ✅ Analítica
    onGoToLogin();
  };

  const handleLogout = async () => {
    try {
      trackEvent("home_logout", { userId: user?.uid }); // ✅ Analítica
      // Limpiar datos de sesión antes de logout
      clearSessionData();
      await signOut(auth);
    } catch (error) {
      logger.error("Error signing out: ", error);
    }
  };

  const toggleLanguage = () => {
    const newLocale = locale === "es" ? "en" : "es";
    setLocale(newLocale);
    trackEvent("home_change_language", { from: locale, to: newLocale });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      {/* Selector de idioma en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-10">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow border border-bocado-green/20"
          aria-label={t("home.changeLanguage")}
        >
          <span className="text-lg">{locale === "es" ? "🇪🇸" : "🇺🇸"}</span>
          <span className="text-sm font-medium text-bocado-dark-gray dark:text-gray-200">
            {locale === "es" ? "ES" : "EN"}
          </span>
        </button>
      </div>

      {/* Card con contenido principal */}
      <div className="w-full max-w-sm rounded-3xl bg-white/5 dark:bg-white/[0.04] border border-white/10 dark:border-white/[0.08] backdrop-blur-sm px-8 py-10 flex flex-col items-center">
        {/* Logo */}
        <div className="w-64 sm:w-72 md:w-80 mb-6">
          <BocadoLogo className="w-full h-auto" />
        </div>

        {/* Texto */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-bocado-dark-gray dark:text-gray-200 mb-2">
            {t("home.title")}{" "}
            <span className="underline decoration-bocado-green decoration-4 underline-offset-4">
              {t("home.titleHighlight")}
            </span>
          </h1>
          <p className="text-base text-bocado-dark-gray dark:text-gray-400">
            {t("home.subtitle")}
          </p>
        </div>

        {/* Botones */}
        <div className="flex flex-col w-full gap-3.5">
          {hasSession ? (
            <>
              <button
                data-testid="enter-app-button"
                onClick={handleEnterApp}
                className="w-full bg-bocado-green text-white font-bold py-3 px-8 rounded-full text-base shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all duration-200 hover:scale-[1.02]"
              >
                {t("home.enterButton")}
              </button>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="w-full bg-white dark:bg-gray-800 text-bocado-green dark:text-bocado-green-light border-2 border-bocado-green font-bold py-3 px-8 rounded-full text-base hover:bg-bocado-background dark:hover:bg-gray-700 active:scale-95 transition-all duration-200 hover:scale-[1.02]"
              >
                {t("home.logoutButton")}
              </button>
            </>
          ) : (
            <>
              <button
                data-testid="start-button"
                onClick={handleStartRegistration}
                className="w-full bg-bocado-green text-white font-bold py-3 px-8 rounded-full text-base shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all duration-200 hover:scale-[1.02]"
              >
                {t("home.startButton")}
              </button>
              <button
                data-testid="login-button"
                onClick={handleGoToLogin}
                className="w-full bg-white dark:bg-gray-800 text-bocado-green dark:text-bocado-green-light border-2 border-bocado-green font-bold py-3 px-8 rounded-full text-base hover:bg-bocado-background dark:hover:bg-gray-700 active:scale-95 transition-all duration-200 hover:scale-[1.02]"
              >
                {t("home.loginButton")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* FatSecret Platform API Attribution */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <a
          href="https://platform.fatsecret.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block hover:opacity-80 transition-opacity"
          aria-label="Powered by FatSecret Platform API"
        >
          <img
            alt="Nutrition information provided by fatsecret Platform API"
            src="https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png"
            srcSet="https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand@2x.png 2x, https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand@3x.png 3x"
            className="h-8 w-auto"
          />
        </a>
        <a
          href="https://platform.fatsecret.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-bocado-gray dark:text-gray-500 hover:text-bocado-green dark:hover:text-bocado-green-light transition-colors"
        >
          Powered by FatSecret Platform API
        </a>
      </div>
    </div>
  );
};

export default HomeScreen;
