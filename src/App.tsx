import React, { useEffect, Suspense, lazy, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trackEvent } from "./firebaseConfig";
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
import { hasSessionInStorage } from "./utils/sessionPersistence";
import {
  debugLog,
  logSessionStatus,
  dumpDebugLogs,
} from "./utils/debugLogger";
import { isProfileComplete } from "./utils/profileValidation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

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
const CompleteProfileScreen = lazy(() => import("./components/CompleteProfileScreen"));
const PlanScreen = lazy(() => import("./components/PlanScreen"));
const MainApp = lazy(() => import("./components/MainApp"));

// Fallback loading component
const ScreenLoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-bocado-cream dark:bg-gray-900">
    <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent 
                    rounded-full animate-spin" />
  </div>
);

export type AppScreen =
  | "home"
  | "registerMethod"
  | "register"
  | "login"
  | "recommendation"
  | "permissions"
  | "completeProfile"
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
  // ✅ Bug 6: rastrear si el usuario viene del flujo de Google (para omitir step email/password)
  const [isGoogleRegistration, setIsGoogleRegistration] = React.useState(false);
  const [authTimeout, setAuthTimeout] = React.useState(false);

  const setLoading = useAuthStore((state) => state.setLoading);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  // Ref para ejecutar navegación inicial solo una vez
  const hasNavigatedRef = useRef(false);

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
      setLoading(false);
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

  // Navegación inicial basada en el estado del auth store (reactivo)
  // AuthProvider maneja el listener de Firebase - aquí solo reaccionamos al store
  useEffect(() => {
    // Esperar a que auth esté resuelto
    if (isLoading) return;
    // Solo navegar una vez al startup
    if (hasNavigatedRef.current) return;

    if (!isAuthenticated) {
      hasNavigatedRef.current = true;
      setCurrentScreen("home");
      return;
    }

    // Usuario autenticado: verificar perfil antes de navegar
    const checkProfileAndNavigate = async () => {
      hasNavigatedRef.current = true;
      try {
        const profileRef = doc(db, "users", user!.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists() && isProfileComplete(profileSnap.data() as any)) {
          setCurrentScreen("recommendation");
        } else {
          setCurrentScreen("completeProfile");
        }
      } catch (err) {
        debugLog("error", "Error checking profile on startup", {
          message: (err as any)?.message || String(err),
        });
        setCurrentScreen("completeProfile");
      }
    };

    checkProfileAndNavigate();
  }, [isLoading, isAuthenticated, user]);

  // Sincronizar estado del usuario con Sentry
  useEffect(() => {
    setUserContext(user?.uid || null, user?.email || undefined);
    if (user) {
      addBreadcrumb("User authenticated", "auth");
    }
  }, [user]);

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

  const renderScreen = () => {
    switch (currentScreen) {
        case "permissions":
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <PermissionsScreen
                  onAccept={() => {
                    if (isAuthenticated) {
                      setCurrentScreen("recommendation");
                    } else {
                      setCurrentScreen("registerMethod");
                    }
                  }}
                  onGoHome={() => setCurrentScreen("home")}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "registerMethod":
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <RegistrationMethodScreen
                  onGoogleSuccess={(uid, email) => {
                    // ✅ Bug 6: marcar que viene de Google para que RegistrationFlow
                    // omita email/password y use auth.currentUser
                    setIsNewUser(true);
                    setIsGoogleRegistration(true);
                    setCurrentScreen("register");
                  }}
                  onChooseEmail={() => {
                    setIsGoogleRegistration(false);
                    setCurrentScreen("register");
                  }}
                  onGoHome={() => setCurrentScreen("home")}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "register":
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <RegistrationFlow
                  isGoogleUser={isGoogleRegistration}
                  onRegistrationComplete={() => {
                    setIsNewUser(true);
                    setIsGoogleRegistration(false);
                    setCurrentScreen("recommendation");
                  }}
                  onGoHome={() => {
                    setIsGoogleRegistration(false);
                    setCurrentScreen("home");
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "login":
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <LoginScreen
                  onLoginSuccess={() => {
                    setIsNewUser(false);
                    setCurrentScreen("recommendation");
                  }}
                  onGoHome={() => setCurrentScreen("home")}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "completeProfile":
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <CompleteProfileScreen
                  onStartCompletion={() => {
                    setCurrentScreen("recommendation");
                  }}
                  onLogout={() => setCurrentScreen("home")}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "recommendation":
          return (
            <ErrorBoundary>
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
            </ErrorBoundary>
          );
        case "plan":
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <PlanScreen
                  planId={planId!}
                  onStartNewPlan={() => {
                    setPlanId(null);
                    setCurrentScreen("recommendation");
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "home":
        default:
          return (
            <ErrorBoundary>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <HomeScreen
                  onStartRegistration={() => setCurrentScreen("registerMethod")}
                  onGoToApp={() => setCurrentScreen("permissions")}
                  onGoToLogin={() => setCurrentScreen("login")}
                />
              </Suspense>
            </ErrorBoundary>
          );
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
