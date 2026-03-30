"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Where to redirect if not authenticated. Defaults to "/login" */
  redirectTo?: string;
}

/**
 * ProtectedRoute - Wraps pages that require authentication.
 * 
 * Because AuthProvider gates rendering until auth is resolved,
 * this component can safely check isAuthenticated synchronously.
 * If user is not authenticated, it redirects immediately - no loading screen.
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // If auth is still loading, wait (shouldn't happen with AuthProvider)
    if (isLoading) return;
    
    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo]);

  // If still loading or not authenticated, render nothing
  // The redirect will happen via the useEffect
  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
