import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useCallback, useMemo, useRef } from "react";
import type { FeatureFlags } from "../types/featureFlags";
import {
  getAllFeatureFlags,
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
  enabled: boolean;
  isLoading: boolean;
  error: Error | null;
  allFlags: FeatureFlags;
  refetch: () => Promise<void>;
}

export interface UseFeatureFlagsReturn {
  flags: FeatureFlags;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
}

// ============================================
// QUERY KEY
// ============================================

export const getFeatureFlagsQueryKey = (userId?: string | null) =>
  [FEATURE_FLAGS_QUERY_KEY, userId || "anonymous"] as const;

// ============================================
// FETCH FUNCTION
// ============================================

const fetchFeatureFlags = async (
  userId?: string | null,
): Promise<FeatureFlags> => {
  logger.info("[useFeatureFlag] Fetching feature flags", {
    userId: userId || "anonymous",
  });
  return getAllFeatureFlags(userId);
};

// ✅ FIX: configuración de query compartida para evitar duplicación
const getQueryConfig = (userId?: string | null, enabled = true) => ({
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
  placeholderData: (previousData: FeatureFlags | undefined) =>
    previousData ?? DEFAULT_FEATURE_FLAGS,
});

// ============================================
// HOOK: Todos los Feature Flags
// ============================================

interface UseFeatureFlagsOptions {
  enabled?: boolean;
  userId?: string | null;
}

export function useFeatureFlags(
  options: UseFeatureFlagsOptions = {},
): UseFeatureFlagsReturn {
  const { enabled = true, userId } = options;

  const query: UseQueryResult<FeatureFlags, Error> = useQuery(
    getQueryConfig(userId, enabled),
  );

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
    refetch: async () => { await query.refetch(); },
    isEnabled,
  };
}

// ============================================
// HOOK: Feature Flag Individual
// ============================================

interface UseFeatureFlagOptions {
  enabled?: boolean;
  userId?: string | null;
}

export function useFeatureFlag(
  featureName: keyof FeatureFlags,
  options: UseFeatureFlagOptions = {},
): UseFeatureFlagReturn {
  const { enabled = true, userId } = options;

  const query: UseQueryResult<FeatureFlags, Error> = useQuery(
    getQueryConfig(userId, enabled),
  );

  const enabledFlag = useMemo(() => {
    return query.data?.[featureName] ?? DEFAULT_FEATURE_FLAGS[featureName];
  }, [query.data, featureName]);

  // ✅ FIX: extraer refetch directamente en vez de wrappear query completo
  const { refetch: queryRefetch } = query;
  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

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
  enabled?: boolean;
  userId?: string | null;
}

export function useMultipleFeatureFlags(
  featureNames: Array<keyof FeatureFlags>,
  options: UseMultipleFeatureFlagsOptions = {},
): Record<keyof FeatureFlags, boolean> & {
  isLoading: boolean;
  error: Error | null;
} {
  const { enabled = true, userId } = options;

  // ✅ FIX: estabilizar featureNames para evitar re-ejecución innecesaria del select
  const featureNamesRef = useRef(featureNames);
  useEffect(() => {
    featureNamesRef.current = featureNames;
  }, [featureNames]);

  const query = useQuery({
    ...getQueryConfig(userId, enabled),
    select: (data) => {
      const result = {} as Record<keyof FeatureFlags, boolean>;
      for (const name of featureNamesRef.current) {
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
  onChange?: (newFlags: FeatureFlags, oldFlags: FeatureFlags) => void;
  userId?: string | null;
}

export function useFeatureFlagsSubscription(
  options: UseFeatureFlagsSubscriptionOptions = {},
): void {
  const { onChange, userId } = options;

  const query = useQuery({
    queryKey: getFeatureFlagsQueryKey(userId),
    queryFn: () => fetchFeatureFlags(userId),
    staleTime: 0,
    refetchInterval: FEATURE_FLAGS_CONFIG.refetchInterval,
    initialData: DEFAULT_FEATURE_FLAGS,
  });

  // ✅ FIX: guardar flags anteriores en ref en vez de leer del cache
  // El cache se sobreescribe inmediatamente y previousData siempre
  // sería igual a query.data, haciendo que haveFlagsChanged sea siempre false
  const previousFlagsRef = useRef<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

  // ✅ Estabilizar onChange con ref para evitar loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!query.data) return;

    const previousFlags = previousFlagsRef.current;
    const newFlags = query.data;

    if (haveFlagsChanged(previousFlags, newFlags)) {
      onChangeRef.current?.(newFlags, previousFlags);
    }

    // Actualizar ref DESPUÉS de comparar
    previousFlagsRef.current = newFlags;
  }, [query.data]);
}

// ============================================
// UTILIDADES
// ============================================

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