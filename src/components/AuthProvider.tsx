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

// Use useLayoutEffect on client, useEffect on server (SSR safety)
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

  // Synchronous pre-check: if no session in storage, we know user is logged out
  // This runs before any React effects and allows immediate redirect
  useIsomorphicLayoutEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const hasStoredSession = hasSessionInStorage();
    
    logger.info("[AuthProvider] Initializing", {
      hasStoredSession,
      timestamp: new Date().toISOString(),
    });

    // If no session in storage, immediately mark as not authenticated
    // This allows protected routes to redirect without waiting for Firebase
    if (!hasStoredSession) {
      logger.info("[AuthProvider] No stored session, marking as unauthenticated");
      setUser(null);
      setAuthReady(true);
      return;
    }

    // Session exists in storage - wait for Firebase to restore it
    let resolved = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (resolved) {
          // Subsequent auth changes after initial resolution
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
        setAuthReady(true);
      },
      (error) => {
        logger.error("[AuthProvider] Auth error", { error });
        setUser(null);
        setLoading(false);
        setAuthReady(true);
      }
    );

    // Safety timeout - if Firebase doesn't respond in 5s, continue anyway
    // This prevents infinite loading on network issues
    const timeout = setTimeout(() => {
      if (!resolved) {
        logger.warn("[AuthProvider] Auth timeout (5s), forcing resolution");
        resolved = true;
        setUser(null);
        setAuthReady(true);
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [setUser, setLoading]);

  // Gate rendering until auth is ready
  // This ensures protected routes never see isLoading=true on mount
  if (!authReady) {
    // Return null instead of a loading spinner
    // The parent layout already provides the shell UI
    // This prevents the "flash of loading screen" problem
    return null;
  }

  return <>{children}</>;
}

export default AuthProvider;
