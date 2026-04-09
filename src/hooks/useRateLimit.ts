import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect } from "react";
import { env } from "../environment/env";
import { useTranslation } from "../contexts/I18nContext";

interface RateLimitStatus {
  requestsInWindow: number;
  currentProcess?: { startedAt: number; interactionId: string };
  canRequest: boolean;
  nextAvailableAt?: number;
  nextAvailableIn: number;
  remainingRequests?: number;
}

const DEFAULT_STATUS: RateLimitStatus = {
  requestsInWindow: 0,
  canRequest: true,
  nextAvailableIn: 0,
  remainingRequests: 5,
};

/**
 * Hook para consultar el estado del rate limit del usuario
 * Permite mostrar al usuario cuándo puede hacer su siguiente request
 */
export const useRateLimit = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const [localSecondsLeft, setLocalSecondsLeft] = useState(0);

  const { data: status = DEFAULT_STATUS, isLoading } = useQuery({
    queryKey: ["rateLimit", userId],
    queryFn: async (): Promise<RateLimitStatus> => {
      if (!userId) return DEFAULT_STATUS;
      const token = await fetchAuthToken();
      if (!token) return DEFAULT_STATUS;
      const response = await fetch(`${env.api.recommendationUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Si falla, asumir que puede hacer request (fail-open)
        return DEFAULT_STATUS;
      }

      const data = await response.json();
      return {
        ...DEFAULT_STATUS,
        ...data,
        nextAvailableIn: typeof data.nextAvailableIn === 'number' && !isNaN(data.nextAvailableIn) 
          ? data.nextAvailableIn 
          : 0,
        nextAvailableAt: typeof data.nextAvailableAt === 'number' 
          ? data.nextAvailableAt 
          : undefined,
      };
    },
    enabled: !!userId,
    // Refrescar cada minuto — suficiente para un countdown
    refetchInterval: 1000 * 60,
    // 30 segundos stale time
    staleTime: 1000 * 30,
  });

  /**
   * Invalida la caché del rate limit
   * Útil después de iniciar una generación
   */
  const refreshStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rateLimit", userId] });
  }, [queryClient, userId]);

  /**
   * Formatea el tiempo restante para mostrar al usuario
   */
  const formatTimeLeft = useCallback(
    (seconds: number): string => {
      // Guard: manejar undefined, null, NaN o <= 0
      const safeSeconds = typeof seconds === 'number' && !isNaN(seconds) && seconds > 0 ? seconds : 0;
      if (safeSeconds <= 0) return "";
      if (safeSeconds < 60) return `${safeSeconds}s`;
      const minutes = Math.floor(safeSeconds / 60);
      const remainingSeconds = safeSeconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    },
    [],
  );

  // Actualiza el countdown cada segundo basándose en nextAvailableAt
  useEffect(() => {
    if (!status.nextAvailableAt) {
      setLocalSecondsLeft(0);
      return;
    }

    const update = () => {
      const secs = Math.max(0, Math.ceil((status.nextAvailableAt! - Date.now()) / 1000));
      setLocalSecondsLeft(secs);
    };

    update(); // ejecutar inmediatamente
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status.nextAvailableAt]);

  // Memoizar el tiempo formateado para evitar cálculos innecesarios
  const formattedTimeLeft = useMemo(() => {
    const formatted = formatTimeLeft(localSecondsLeft);
    // Si el resultado es vacío y no puede hacer request, mostrar "calculando"
    if (formatted === "" && !status.canRequest) {
      return t("rateLimit.calculating") || "Calculating...";
    }
    return formatted;
  }, [formatTimeLeft, localSecondsLeft, status.canRequest, t]);

  // ✅ FIX: Calculate renewal time for better UX
  const renewalTime = useMemo(() => {
    if (!status?.nextAvailableAt) return null;
    return new Date(status.nextAvailableAt).toLocaleTimeString(
      locale === "en" ? "en-US" : "es-ES",
      { hour: "2-digit", minute: "2-digit" },
    );
  }, [status?.nextAvailableAt, locale]);

  // Memoizar el mensaje
  const message = useMemo(() => {
    if (!status.canRequest) {
      return t("rateLimit.wait", {
        time: formatTimeLeft(status.nextAvailableIn),
      });
    }
    // Cuando puede hacer requests, mostrar info util
    const remaining = status.remainingRequests ?? 5;
    if (remaining <= 2) {
      return remaining === 1
        ? t("rateLimit.warning", { count: remaining })
        : t("rateLimit.warningPlural", { count: remaining });
    }
    return t("rateLimit.sessionInfo", { count: remaining });
  }, [
    t,
    formatTimeLeft,
    status.canRequest,
    status.nextAvailableIn,
    status.remainingRequests,
  ]);

  return {
    ...status,
    isLoading,
    refreshStatus,
    formattedTimeLeft,
    renewalTime,
    // Helper para deshabilitar botón
    isDisabled: !status.canRequest || isLoading,
    // Mensaje para mostrar al usuario
    message,
  };
};

const fetchAuthToken = async (): Promise<string | null> => {
  try {
    const { auth } = await import("../firebaseConfig");
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
};

export default useRateLimit;
