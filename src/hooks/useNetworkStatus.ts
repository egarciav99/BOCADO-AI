import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "../utils/logger";

interface NetworkState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  connectionType: string;
  downlink: number | null;
}

interface UseNetworkStatusOptions {
  showReconnectionToast?: boolean;
  onOffline?: () => void;
  onOnline?: () => void;
  minOfflineDuration?: number;
}

// ✅ FIX: extraído fuera del hook — no captura estado, siempre estable
const getConnectionInfo = () => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (connection) {
    return {
      connectionType: connection.effectiveType || "unknown",
      downlink: connection.downlink || null,
    };
  }

  return { connectionType: "unknown", downlink: null };
};

export const useNetworkStatus = (options: UseNetworkStatusOptions = {}) => {
  const {
    showReconnectionToast = true,
    onOffline,
    onOnline,
    minOfflineDuration = 2000,
  } = options;

  const [state, setState] = useState<NetworkState>({
    isOnline: true,
    isOffline: false,
    wasOffline: false,
    connectionType: "unknown",
    downlink: null,
  });

  const offlineStartTime = useRef<number | null>(null);
  const hasShownToast = useRef(false);
  const hasInitialized = useRef(false);

  // ✅ FIX: callbacks estabilizados con refs para evitar re-registro de listeners
  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);
  useEffect(() => { onOnlineRef.current = onOnline; }, [onOnline]);
  useEffect(() => { onOfflineRef.current = onOffline; }, [onOffline]);

  // ✅ FIX: isOnline como ref para visibilitychange — evita re-registro del listener
  const isOnlineRef = useRef(state.isOnline);
  useEffect(() => { isOnlineRef.current = state.isOnline; }, [state.isOnline]);

  const handleOnline = useCallback(() => {
    const offlineDuration = offlineStartTime.current
      ? Date.now() - offlineStartTime.current
      : 0;

    logger.info("Network: Conexión restaurada", {
      offlineDuration,
      connectionInfo: getConnectionInfo(),
    });

    setState((prev) => ({
      ...prev,
      isOnline: true,
      isOffline: false,
      wasOffline: prev.isOffline,
      ...getConnectionInfo(),
    }));

    if (
      showReconnectionToast &&
      offlineDuration > minOfflineDuration &&
      !hasShownToast.current
    ) {
      hasShownToast.current = true;
    }

    onOnlineRef.current?.();
    offlineStartTime.current = null;
  // ✅ onOnline removido de deps — estabilizado via ref
  }, [showReconnectionToast, minOfflineDuration]);

  const handleOffline = useCallback(() => {
    logger.warn("Network: Sin conexión");

    offlineStartTime.current = Date.now();
    hasShownToast.current = false;

    setState((prev) => ({
      ...prev,
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    }));

    onOfflineRef.current?.();
  // ✅ onOffline removido de deps — estabilizado via ref
  }, []);

  // Event listeners de conectividad
  useEffect(() => {
    if (!hasInitialized.current) {
      const isCurrentlyOnline =
        typeof navigator !== "undefined" ? navigator.onLine : true;
      setState((prev) => ({
        ...prev,
        isOnline: isCurrentlyOnline,
        isOffline: !isCurrentlyOnline,
        ...getConnectionInfo(),
      }));
      hasInitialized.current = true;
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        setState((prev) => ({ ...prev, ...getConnectionInfo() }));
        logger.info("Network: Cambio en calidad de conexión", getConnectionInfo());
      };

      connection.addEventListener("change", handleConnectionChange);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection.removeEventListener("change", handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // ✅ FIX: visibilitychange usa ref para isOnline — sin state en deps
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const isCurrentlyOnline = navigator.onLine;
        if (isCurrentlyOnline !== isOnlineRef.current) {
          if (isCurrentlyOnline) {
            handleOnline();
          } else {
            handleOffline();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  // ✅ state.isOnline removido de deps — accedido via ref
  }, [handleOnline, handleOffline]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch("/manifest.json", {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    checkConnection,
    shouldShowReconnectionToast: state.wasOffline && showReconnectionToast,
  };
};

/**
 * Hook simplificado que solo retorna el estado online/offline
 */
export const useIsOnline = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};

export default useNetworkStatus;