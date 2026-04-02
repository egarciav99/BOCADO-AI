"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useAuthStore } from "../stores/authStore";
import {
  hasSessionInStorage,
  markSessionRestored,
} from "../utils/sessionPersistence";
import { saveUserDataForOffline, recordTokenRefresh } from "../utils/tokenPersistence";
import { setUserContext, addBreadcrumb } from "../utils/sentry";
import { logger } from "../utils/logger";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider - Initializes Firebase auth listener and gates rendering
 * until auth state is resolved.
 *
 * Key behaviors:
 * 1. Synchronously checks localStorage for existing Firebase session
 * 2. Sets up onAuthStateChanged listener
 * 3. Blocks children from rendering until auth state is determined
 * 4. No loading spinner - auth resolves before any protected component mounts
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [authReady, setAuthReady] = useState(false);
  const hasInitialized = useRef(false);

  // ✅ FIX: ref para saber si authReady se resolvió — usado por el fallback
  const authReadyRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const hasStoredSession = hasSessionInStorage();

    logger.info("[AuthProvider] Initializing", {
      hasStoredSession,
      timestamp: new Date().toISOString(),
    });

    if (!hasStoredSession) {
      logger.info("[AuthProvider] No stored session, marking as unauthenticated");
      setUser(null);
      authReadyRef.current = true;
      setAuthReady(true);
      return;
    }

    let resolved = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (resolved) {
          logger.info("[AuthProvider] Auth state changed", {
            hasUser: !!user,
            uid: user?.uid?.substring(0, 8),
          });
        } else {
          resolved = true;
          logger.info("[AuthProvider] Initial auth resolved", {
            hasUser: !!user,
            uid: user?.uid?.substring(0, 8),
          });
        }

        if (user) {
          markSessionRestored();
          recordTokenRefresh();
          saveUserDataForOffline(user);
          setUserContext(user.uid, user.email || undefined);
          addBreadcrumb("User authenticated", "auth");
        } else {
          saveUserDataForOffline(null);
          setUserContext(null);
          addBreadcrumb("User logged out", "auth");
        }

        setUser(user);
        authReadyRef.current = true;
        setAuthReady(true);
      },
      (error) => {
        logger.error("[AuthProvider] Auth error", { error });
        setUser(null);
        setLoading(false);
        authReadyRef.current = true;
        setAuthReady(true);
      },
    );

    // ✅ FIX: timeout distingue entre "Firebase tardó" y "no hay sesión"
    // Si Firebase no responde en 5s pero había sesión en storage,
    // NO forzamos setUser(null) — dejamos al usuario en el estado que tenía
    // y simplemente desbloqueamos el render para que el resto de la app
    // pueda manejar el estado de carga normalmente.
    const authTimeout: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (!resolved) {
        logger.warn("[AuthProvider] Auth timeout (5s), unblocking render without forcing logout");
        resolved = true;
        setLoading(false); // ← llevar isLoading a false para desbloquear componentes
        authReadyRef.current = true;
        setAuthReady(true);
      }
    }, 5000);

    // ✅ FIX: fallback de emergencia — si authReady nunca se resuelve
    // por algún bug futuro, desbloqueamos a los 10s para evitar pantalla blanca infinita
    const emergencyTimeout: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (!authReadyRef.current) {
        logger.error("[AuthProvider] Emergency timeout (10s) — authReady never resolved");
        authReadyRef.current = true;
        setAuthReady(true);
      }
    }, 10000);

    return () => {
      clearTimeout(authTimeout);
      clearTimeout(emergencyTimeout);
      unsubscribe();
    };
  // ✅ FIX: deps vacías — el efecto solo debe correr una vez al montar.
  // hasInitialized.current ya lo garantiza, pero [] lo documenta explícitamente.
  // setUser y setLoading son referencias estables de Zustand — no necesitan
  // estar en deps, y si cambiaran el guard hasInitialized lo protegería.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authReady) {
    // Retornamos null en vez de spinner para evitar flash de pantalla de carga.
    // El layout padre ya provee el shell UI mientras tanto.
    return null;
  }

  return <>{children}</>;
}

export default AuthProvider;