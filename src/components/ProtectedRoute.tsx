"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute - Wraps pages that require authentication.
 *
 * ARQUITECTURA: La protección es cliente-only (no hay middleware.ts de Next.js).
 * Esto es intencional para esta PWA: el contenido sensible viene de Firestore
 * (protegido por Firebase Security Rules), no del SSR. Un acceso directo por URL
 * sin JS activo obtiene el HTML del shell vacío, no datos del usuario.
 *
 * Si en el futuro se añade SSR con datos sensibles, añadir middleware.ts.
 *
 * AuthProvider gates rendering until auth is resolved, so isLoading
 * should always be false by the time this component mounts.
 * The useEffect handles the case where auth state changes AFTER mount
 * (e.g. session expiry, manual sign-out from another tab).
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  // ✅ FIX: useEffect handles post-mount auth changes (sign-out, expiry)
  // The sync guard below handles the initial render
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // ✅ FIX: sync guard — single source of truth, user removed (redundant with isAuthenticated)
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;