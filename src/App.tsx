import React, { useEffect, Suspense, lazy } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { auth, trackEvent } from "./firebaseConfig";
import { env } from "./environment/env";
import { useAuthStore } from "./stores/authStore";
import ErrorBoundary from "./components/ErrorBoundary";
import { SentryErrorBoundary } from "./components/SentryErrorBoundary";
import PWABanner from "./components/PWABanner";
import NetworkStatusToast from "./components/NetworkStatusToast";
import { captureError, setUserContext, addBreadcrumb } from "./utils/sentry";
import { I18nProvider, useTranslation } from "./contexts/I18nContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastContainer } from "./components/ui/Toast";
import { FeedbackModalProvider } from "./components/FeedbackModal";
import { logEnvironmentStatus } from "./utils/envValidator";
import { markSessionRestored, hasSessionInStorage } from "./utils/sessionPersistence";
import {
  logAuthState,
  validateAuthTokenStorage,
  detectPrivateMode,
} from "./utils/authDebug";
import {
  saveUserDataForOffline,
  recordTokenRefresh,
  getFirebaseTokenDiagnostics,
} from "./utils/tokenPersistence";
import {
  debugLog,
  logSessionStatus,
  dumpDebugLogs,
} from "./utils/debugLogger";

// ✅ DEBUG: Import debug console (only in development)
const DebugConsole = lazy(() =>
  import("./components/DebugConsole").then((m) => ({
    default: m.DebugConsole,
  })),
);

// 🚀 LAZY LOADING: Reduce bundle inicial ~50KB
const HomeScreen = lazy(() => import("./components/HomeScreen"));
const RegistrationMethodScreen = lazy(() => import("./components/RegistrationMethodScreen"));
const RegistrationFlow = lazy(() => import("./components/RegistrationFlow"));
const LoginScreen = lazy(() => import("./components/LoginScreen"));
const PermissionsScreen = lazy(() => import("./components/PermissionsScreen"));
const PlanScreen = lazy(() => import("./components/PlanScreen"));
const MainApp = lazy(() => import("./components/MainApp"));

// Fallback loading component
const ScreenLoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-white dark:bg-slate-950">
    <div className="animate-pulse text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto mb-4"></div>
      <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
    </div>
  </div>
);

export type AppScreen =
  | "home"
  | "registerMethod"
  | "register"
  | "login"
  | "recommendation"
  | "permissions"
  | "plan";

// Configuración de TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [currentScreen, setCurrentScreen] = React.useState<AppScreen>("home");
  const [planId, setPlanId] = React.useState<string | null>(null);
  const [isNewUser, setIsNewUser] = React.useState(false);
  const [authTimeout, setAuthTimeout] = React.useState(false);
  const [renderError, setRenderError] = React.useState<Error | null>(null);

  const setUser = useAuthStore((state) => state.setUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { t } = useTranslation();

  // Validar variables de entorno al inicializar
  React.useEffect(() => {
    logEnvironmentStatus();
    
    // ✅ DEBUG: Verificar estado de autenticación al startup
    debugLog("state", "APP_STARTUP", {
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });

    logSessionStatus();

    const hasStorage = hasSessionInStorage();
    debugLog("info", "Checking session in storage", {
      hasStorageSession: hasStorage,
    });

    if (process.env.NODE_ENV === "development") {
      // Mostrar logs en la consola en desarrollo
      setTimeout(() => {
        dumpDebugLogs();
      }, 500);
    }
  }, []);

  // Timeout de seguridad: si Firebase no responde en 10s, forzar continuar
  // Aumentado a 10s para permitir que Firebase restaure la sesión desde localStorage
  React.useEffect(() => {
    if (!isLoading) return; // Ya resolvió, no crear timer
    const timer = setTimeout(() => {
      console.warn("[App] Timeout de autenticación (10s) alcanzado");
      setAuthTimeout(true);
      useAuthStore.getState().setLoading(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]); // ← Solo depende de isLoading

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      trackEvent("exception", { description: event.message, fatal: true });
      captureError(event.error || new Error(event.message), {
        type: "global_error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    const handlePromiseError = (event: PromiseRejectionEvent) => {
      trackEvent("promise_error", { reason: String(event.reason) });
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      captureError(error, { type: "unhandled_promise_rejection" });
    };
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handlePromiseError);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handlePromiseError);
    };
  }, []);

  useEffect(() => {
    trackEvent("screen_view", { screen_name: currentScreen });
  }, [currentScreen]);

  useEffect(() => {
    // Verificar que Firebase esté configurado
    if (!env.firebase.apiKey || env.firebase.apiKey === "") {
      debugLog("error", "Firebase API Key not configured", {});
      setAuthTimeout(true);
      useAuthStore.getState().setLoading(false);
      return;
    }

    debugLog("info", "Firebase API Key found", {
      projectId: env.firebase.projectId,
    });

    let unsubscribe: (() => void) | null = null;
    let authStateChangedCount = 0;

    try {
      // Diagnóstico de sesión
      const hasStorageSession = hasSessionInStorage();
      
      debugLog("info", "Setting up onAuthStateChanged", {
        hasStorageSession,
      });

      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          authStateChangedCount++;

          if (user) {
            debugLog("state", "Session Restored from Firebase", {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified,
              count: authStateChangedCount,
            });

            markSessionRestored();
            recordTokenRefresh();
            trackEvent("session_restored", { userId: user.uid });
          } else {
            debugLog("warn", "No Session Found", {
              count: authStateChangedCount,
            });
          }

          // ✅ Guardar datos del usuario para restauración offline
          saveUserDataForOffline(user);

          setUser(user);
          // Sincronizar usuario con Sentry para tracking de errores
          setUserContext(user?.uid || null, user?.email || undefined);
          if (user) {
            addBreadcrumb("User authenticated", "auth");
            setCurrentScreen("recommendation");
          } else {
            addBreadcrumb("User logged out", "auth");
            setCurrentScreen("home");
          }
        },
        (error) => {
          debugLog("error", "Auth State Changed Error", {
            code: (error as any)?.code,
            message: (error as any)?.message,
          });

          captureError(error, { type: "auth_state_change_error" });
          setAuthTimeout(true);
          useAuthStore.getState().setLoading(false);
        },
      );
    } catch (error) {
      debugLog("error", "Critical error setting up auth", {
        message: (error as any)?.message || String(error),
      });
      captureError(error as Error, { type: "auth_setup_error" });
      setAuthTimeout(true);
      useAuthStore.getState().setLoading(false);
      return;
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setUser]);

  if (isLoading && !authTimeout) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bocado-cream dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-bocado-green font-bold animate-pulse">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Si hay timeout, mostrar error de configuración
  if (authTimeout) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bocado-cream dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-xl font-bold text-bocado-dark-green dark:text-gray-200 mb-2">
            {t("errors.configError")}
          </h1>
          <p className="text-bocado-gray dark:text-gray-400 mb-4">
            {t("errors.configErrorDesc")}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-bocado-green text-white px-6 py-3 rounded-full font-bold hover:bg-bocado-dark-green transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Si hay error de renderizado
  if (renderError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bocado-cream dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">💥</div>
          <h1 className="text-xl font-bold text-bocado-dark-green dark:text-gray-200 mb-2">
            {t("errors.renderError")}
          </h1>
          <p className="text-bocado-gray dark:text-gray-400 mb-4">
            {renderError.message}
          </p>
          <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
            {renderError.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-bocado-green text-white px-6 py-3 rounded-full font-bold hover:bg-bocado-dark-green transition-colors"
          >
            {t("errors.reload")}
          </button>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    try {
      switch (currentScreen) {
        case "permissions":
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <PermissionsScreen
                onAccept={() => setCurrentScreen("registerMethod")}
                onGoHome={() => setCurrentScreen("home")}
              />
            </Suspense>
          );
        case "registerMethod":
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <RegistrationMethodScreen
                onGoogleSuccess={(uid, email) => {
                  // Usuario se registró con Google, ir al flujo de completar perfil
                  setIsNewUser(true);
                  setCurrentScreen("register");
                }}
                onChooseEmail={() => setCurrentScreen("register")}
                onGoHome={() => setCurrentScreen("home")}
              />
            </Suspense>
          );
        case "register":
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <RegistrationFlow
                onRegistrationComplete={() => {
                  setIsNewUser(true);
                  setCurrentScreen("recommendation");
                }}
                onGoHome={() => setCurrentScreen("home")}
              />
            </Suspense>
          );
        case "login":
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <LoginScreen
                onLoginSuccess={() => {
                  setIsNewUser(false);
                  setCurrentScreen("recommendation");
                }}
                onGoHome={() => setCurrentScreen("home")}
              />
            </Suspense>
          );
        case "recommendation":
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <MainApp
                showTutorial={isNewUser}
                onPlanGenerated={(id) => {
                  setPlanId(id);
                  setCurrentScreen("plan");
                }}
                onTutorialFinished={() => setIsNewUser(false)}
                onLogoutComplete={() => setCurrentScreen("home")}
              />
            </Suspense>
          );
        case "plan":
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <PlanScreen
                planId={planId!}
                onStartNewPlan={() => {
                  setPlanId(null);
                  setCurrentScreen("recommendation");
                }}
              />
            </Suspense>
          );
        case "home":
        default:
          return (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <HomeScreen
                onStartRegistration={() => setCurrentScreen("registerMethod")}
                onGoToApp={() => setCurrentScreen("permissions")}
                onGoToLogin={() => setCurrentScreen("login")}
              />
            </Suspense>
          );
      }
    } catch (error) {
      setRenderError(error as Error);
      throw error;
    }
  };

  return (
    <SentryErrorBoundary>
      <div className="min-h-[100dvh] bg-bocado-cream dark:bg-gray-900 flex justify-center items-start md:items-center md:p-8 lg:p-10 2xl:p-12">
        <div
          className="w-full h-[100dvh] md:h-[min(900px,calc(100dvh-4rem))] md:min-h-[640px] bg-bocado-background dark:bg-gray-800 
            md:max-w-app-lg lg:max-w-app-xl xl:max-w-screen-lg
            md:rounded-4xl md:shadow-bocado-lg 
            md:border-8 md:border-white dark:md:border-gray-700
            overflow-visible relative flex flex-col"
        >
          {/* PWA Banner dentro del contenedor del teléfono */}
          <PWABanner
            showInstall={
              currentScreen === "home" || currentScreen === "recommendation"
            }
          />

          {/* Notificaciones de estado de red */}
          <NetworkStatusToast />

          {/* ✅ FIX: Toast notifications for better mobile UX */}
          <ToastContainer />

          {/* Renderizado con Error Boundary - ocupa todo el espacio disponible */}
          <div className="flex-1 min-h-0">
            <ErrorBoundary>{renderScreen()}</ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Debug Console (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <DebugConsole />
        </Suspense>
      )}
    </SentryErrorBoundary>
  );
}

// ✅ WRAPPER CON PROVIDERS Y ERROR BOUNDARY GLOBAL
function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <FeedbackModalProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </FeedbackModalProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
