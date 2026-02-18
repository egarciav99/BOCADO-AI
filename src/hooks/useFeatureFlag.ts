// src/hooks/useFeatureFlag.ts - Hook para Feature Flags con TanStack Query

import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useCallback, useMemo } from "react";
import type { FeatureFlags } from "../types/featureFlags";
import {
  getAllFeatureFlags,
  getEffectiveFeatureFlags,
  isFeatureEnabled,
  haveFlagsChanged,
} from "../services/featureFlags";
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS_CONFIG,
  FEATURE_FLAGS_QUERY_KEY,
} from "../config/featureFlags";
import { logger } from "../utils/logger";

// ============================================
// TIPOS
// ============================================

export interface UseFeatureFlagReturn {
  /** Indica si el feature está habilitado */
  enabled: boolean;
  /** Indica si los flags están cargando */
  isLoading: boolean;
  /** Error de carga si existe */
  error: Error | null;
  /** Todos los flags (para uso avanzado) */
  allFlags: FeatureFlags;
  /** Refetch manual de los flags */
  refetch: () => Promise<void>;
}

export interface UseFeatureFlagsReturn {
  /** Todos los feature flags combinados */
  flags: FeatureFlags;
  /** Indica si están cargando */
  isLoading: boolean;
  /** Error si existe */
  error: Error | null;
  /** Timestamp de última actualización */
  lastUpdated: number | null;
  /** Refetch manual */
  refetch: () => Promise<void>;
  /** Verificar si un feature específico está habilitado */
  isEnabled: (feature: keyof FeatureFlags) => boolean;
}

// ============================================
// QUERY KEY
// ============================================

/**
 * Genera la query key para TanStack Query.
 */
export const getFeatureFlagsQueryKey = (userId?: string | null) =>
  [FEATURE_FLAGS_QUERY_KEY, userId || "anonymous"] as const;

// ============================================
// FETCH FUNCTION
// ============================================

/**
 * Función de fetch para TanStack Query.
 */
const fetchFeatureFlags = async (
  userId?: string | null,
): Promise<FeatureFlags> => {
  logger.info("[useFeatureFlag] Fetching feature flags", {
    userId: userId || "anonymous",
  });
  return getAllFeatureFlags(userId);
};

// ============================================
// HOOK: Todos los Feature Flags
// ============================================

interface UseFeatureFlagsOptions {
  /** Habilitar/deshabilitar la query */
  enabled?: boolean;
  /** ID del usuario actual */
  userId?: string | null;
}

/**
 * Hook para obtener todos los feature flags.
 * Usa TanStack Query para cacheo y refetch automático.
 *
 * @example
 * ```tsx
 * const { flags, isLoading, isEnabled } = useFeatureFlags({ userId: currentUser?.uid });
 *
 * if (isEnabled('darkMode')) {
 *   return <DarkTheme />;
 * }
 * ```
 */
export function useFeatureFlags(
  options: UseFeatureFlagsOptions = {},
): UseFeatureFlagsReturn {
  const { enabled = true, userId } = options;

  const query: UseQueryResult<FeatureFlags, Error> = useQuery({
    queryKey: getFeatureFlagsQueryKey(userId),
    queryFn: () => fetchFeatureFlags(userId),
    enabled,
    staleTime: FEATURE_FLAGS_CONFIG.staleTime,
    gcTime: FEATURE_FLAGS_CONFIG.gcTime,
    refetchInterval: FEATURE_FLAGS_CONFIG.refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: FEATURE_FLAGS_CONFIG.retryCount,
    retryDelay: FEATURE_FLAGS_CONFIG.retryDelay,
    // Valor inicial mientras carga
    initialData: DEFAULT_FEATURE_FLAGS,
    // En caso de error, mantener el último valor conocido o usar defaults
    placeholderData: (previousData) => previousData ?? DEFAULT_FEATURE_FLAGS,
  });

  const isEnabled = useCallback(
    (feature: keyof FeatureFlags): boolean => {
      return query.data?.[feature] ?? DEFAULT_FEATURE_FLAGS[feature];
    },
    [query.data],
  );

  return {
    flags: query.data ?? DEFAULT_FEATURE_FLAGS,
    isLoading: query.isLoading,
    error: query.error,
    lastUpdated: query.dataUpdatedAt,
    refetch: async () => {
      await query.refetch();
    },
    isEnabled,
  };
}

// ============================================
// HOOK: Feature Flag Individual
// ============================================

interface UseFeatureFlagOptions {
  /** Habilitar/deshabilitar la query */
  enabled?: boolean;
  /** ID del usuario actual */
  userId?: string | null;
}

/**
 * Hook para verificar un feature flag específico.
 *
 * @param featureName - Nombre del feature a verificar
 * @param options - Opciones del hook
 *
 * @example
 * ```tsx
 * const { enabled, isLoading } = useFeatureFlag('darkMode', { userId: currentUser?.uid });
 *
 * return (
 *   <div className={enabled ? 'dark' : 'light'}>
 *     {isLoading ? 'Loading...' : <Content />}
 *   </div>
 * );
 * ```
 */
export function useFeatureFlag(
  featureName: keyof FeatureFlags,
  options: UseFeatureFlagOptions = {},
): UseFeatureFlagReturn {
  const { enabled = true, userId } = options;

  const query: UseQueryResult<FeatureFlags, Error> = useQuery({
    queryKey: getFeatureFlagsQueryKey(userId),
    queryFn: () => fetchFeatureFlags(userId),
    enabled,
    staleTime: FEATURE_FLAGS_CONFIG.staleTime,
    gcTime: FEATURE_FLAGS_CONFIG.gcTime,
    refetchInterval: FEATURE_FLAGS_CONFIG.refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: FEATURE_FLAGS_CONFIG.retryCount,
    retryDelay: FEATURE_FLAGS_CONFIG.retryDelay,
    initialData: DEFAULT_FEATURE_FLAGS,
    placeholderData: (previousData) => previousData ?? DEFAULT_FEATURE_FLAGS,
  });

  const enabledFlag = useMemo(() => {
    return query.data?.[featureName] ?? DEFAULT_FEATURE_FLAGS[featureName];
  }, [query.data, featureName]);

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    enabled: enabledFlag,
    isLoading: query.isLoading,
    error: query.error,
    allFlags: query.data ?? DEFAULT_FEATURE_FLAGS,
    refetch,
  };
}

// ============================================
// HOOK: Múltiples Feature Flags
// ============================================

interface UseMultipleFeatureFlagsOptions {
  /** Habilitar/deshabilitar la query */
  enabled?: boolean;
  /** ID del usuario actual */
  userId?: string | null;
}

/**
 * Hook para verificar múltiples feature flags a la vez.
 * Útil cuando un componente necesita varios flags.
 *
 * @param featureNames - Array de nombres de features
 * @param options - Opciones del hook
 *
 * @example
 * ```tsx
 * const flags = useMultipleFeatureFlags(['darkMode', 'pantryV2'], { userId });
 *
 * if (flags.darkMode) return <DarkTheme />;
 * if (flags.pantryV2) return <PantryV2 />;
 * ```
 */
export function useMultipleFeatureFlags(
  featureNames: Array<keyof FeatureFlags>,
  options: UseMultipleFeatureFlagsOptions = {},
): Record<keyof FeatureFlags, boolean> & {
  isLoading: boolean;
  error: Error | null;
} {
  const { enabled = true, userId } = options;

  const query = useQuery({
    queryKey: getFeatureFlagsQueryKey(userId),
    queryFn: () => fetchFeatureFlags(userId),
    enabled,
    staleTime: FEATURE_FLAGS_CONFIG.staleTime,
    gcTime: FEATURE_FLAGS_CONFIG.gcTime,
    refetchInterval: FEATURE_FLAGS_CONFIG.refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: FEATURE_FLAGS_CONFIG.retryCount,
    retryDelay: FEATURE_FLAGS_CONFIG.retryDelay,
    initialData: DEFAULT_FEATURE_FLAGS,
    placeholderData: (previousData) => previousData ?? DEFAULT_FEATURE_FLAGS,
    // Select para optimizar re-renders
    select: (data) => {
      const result = {} as Record<keyof FeatureFlags, boolean>;
      for (const name of featureNames) {
        result[name] = data[name] ?? DEFAULT_FEATURE_FLAGS[name];
      }
      return result;
    },
  });

  return {
    ...(query.data as Record<keyof FeatureFlags, boolean>),
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ============================================
// HOOK: Prefetch de Feature Flags
// ============================================

/**
 * Hook para hacer prefetch de feature flags.
 * Útil para precargar al iniciar sesión.
 *
 * @example
 * ```tsx
 * const prefetchFeatureFlags = usePrefetchFeatureFlags();
 *
 * // Al hacer login exitoso
 * prefetchFeatureFlags(currentUser.uid);
 * ```
 */
export function usePrefetchFeatureFlags() {
  const queryClient = useQueryClient();

  return useCallback(
    (userId?: string | null) => {
      queryClient.prefetchQuery({
        queryKey: getFeatureFlagsQueryKey(userId),
        queryFn: () => fetchFeatureFlags(userId),
        staleTime: FEATURE_FLAGS_CONFIG.staleTime,
      });

      logger.info("[useFeatureFlag] Prefetch triggered", {
        userId: userId || "anonymous",
      });
    },
    [queryClient],
  );
}

// ============================================
// HOOK: Suscripción a cambios
// ============================================

interface UseFeatureFlagsSubscriptionOptions {
  /** Callback cuando cambian los flags */
  onChange?: (newFlags: FeatureFlags, oldFlags: FeatureFlags) => void;
  /** ID del usuario */
  userId?: string | null;
}

/**
 * Hook que suscribe a cambios en los feature flags.
 * Útil para componentes que necesitan reaccionar a cambios dinámicos.
 *
 * @example
 * ```tsx
 * useFeatureFlagsSubscription({
 *   userId: currentUser?.uid,
 *   onChange: (newFlags, oldFlags) => {
 *     if (newFlags.darkMode !== oldFlags.darkMode) {
 *       showToast('Dark mode updated!');
 *     }
 *   }
 * });
 * ```
 */
export function useFeatureFlagsSubscription(
  options: UseFeatureFlagsSubscriptionOptions = {},
): void {
  const { onChange, userId } = options;
  const queryClient = useQueryClient();

  const queryKey = getFeatureFlagsQueryKey(userId);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchFeatureFlags(userId),
    staleTime: 0, // Siempre fresh para detectar cambios
    refetchInterval: FEATURE_FLAGS_CONFIG.refetchInterval,
    initialData: DEFAULT_FEATURE_FLAGS,
  });

  useEffect(() => {
    if (!onChange || !query.data) return;

    const previousData = queryClient.getQueryData<FeatureFlags>(queryKey);

    if (previousData && haveFlagsChanged(previousData, query.data)) {
      onChange(query.data, previousData);
    }

    // Actualizar el cache con los nuevos datos
    queryClient.setQueryData(queryKey, query.data);
  }, [query.data, onChange, queryClient, queryKey]);
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Invalida el cache de feature flags.
 * Útil después de acciones administrativas.
 */
export function useInvalidateFeatureFlags() {
  const queryClient = useQueryClient();

  return useCallback(
    (userId?: string | null) => {
      queryClient.invalidateQueries({
        queryKey: getFeatureFlagsQueryKey(userId),
      });

      logger.info("[useFeatureFlag] Cache invalidated", {
        userId: userId || "all",
      });
    },
    [queryClient],
  );
}
