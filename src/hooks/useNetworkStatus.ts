import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface NetworkState {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  connectionType: string;
  downlink: number | null;
}

interface UseNetworkStatusOptions {
  /** Mostrar toast cuando se recupere la conexión */
  showReconnectionToast?: boolean;
  /** Callback cuando se pierde la conexión */
  onOffline?: () => void;
  /** Callback cuando se recupera la conexión */
  onOnline?: () => void;
  /** Tiempo mínimo offline antes de mostrar notificación (ms) */
  minOfflineDuration?: number;
}

/**
 * Hook para detectar y manejar el estado de la conexión de red
 * 
 * @example
 * ```tsx
 * // Uso básico
 * const { isOnline, isOffline } = useNetworkStatus();
 * 
 * // Con callbacks y toast
 * const { isOnline } = useNetworkStatus({
 *   showReconnectionToast: true,
 *   onOffline: () => toast.error('Sin conexión'),
 *   onOnline: () => toast.success('Conexión restaurada'),
 * });
 * ```
 */
export const useNetworkStatus = (options: UseNetworkStatusOptions = {}) => {
  const {
    showReconnectionToast = true,
    onOffline,
    onOnline,
    minOfflineDuration = 2000,
  } = options;

  const [state, setState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    wasOffline: false,
    connectionType: 'unknown',
    downlink: null,
  });

  const offlineStartTime = useRef<number | null>(null);
  const hasShownToast = useRef(false);

  // Obtener información de conexión (Network Information API)
  const getConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      return {
        type: connection.effectiveType || 'unknown',
        downlink: connection.downlink || null,
      };
    }

    return { type: 'unknown', downlink: null };
  }, []);

  // Manejar evento online
  const handleOnline = useCallback(() => {
    const offlineDuration = offlineStartTime.current 
      ? Date.now() - offlineStartTime.current 
      : 0;

    logger.info('Network: Conexión restaurada', { 
      offlineDuration,
      connectionInfo: getConnectionInfo(),
    });

    setState(prev => ({
      ...prev,
      isOnline: true,
      isOffline: false,
      wasOffline: prev.isOffline,
      ...getConnectionInfo(),
    }));

    // Mostrar toast si estuvo offline suficiente tiempo
    if (showReconnectionToast && 
        offlineDuration > minOfflineDuration && 
        !hasShownToast.current) {
      hasShownToast.current = true;
      // El toast se maneja via el componente que consume el hook
    }

    onOnline?.();
    offlineStartTime.current = null;
  }, [onOnline, showReconnectionToast, minOfflineDuration, getConnectionInfo]);

  // Manejar evento offline
  const handleOffline = useCallback(() => {
    logger.warn('Network: Sin conexión');

    offlineStartTime.current = Date.now();
    hasShownToast.current = false;

    setState(prev => ({
      ...prev,
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    }));

    onOffline?.();
  }, [onOffline]);

  // Verificar conexión activa (no solo estado del navegador)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Intentar fetch a un endpoint pequeño o usar el propio origin
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Efecto para escuchar cambios de conectividad
  useEffect(() => {
    // Estado inicial
    const connectionInfo = getConnectionInfo();
    setState(prev => ({
      ...prev,
      ...connectionInfo,
    }));

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Escuchar cambios en la calidad de conexión
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        setState(prev => ({
          ...prev,
          ...getConnectionInfo(),
        }));
        logger.info('Network: Cambio en calidad de conexión', getConnectionInfo());
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, getConnectionInfo]);

  // Sincronizar cuando la app vuelve a estar visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const isCurrentlyOnline = navigator.onLine;
        
        // Solo actualizar si hay cambio
        if (isCurrentlyOnline !== state.isOnline) {
          if (isCurrentlyOnline) {
            handleOnline();
          } else {
            handleOffline();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isOnline, handleOnline, handleOffline]);

  return {
    ...state,
    checkConnection,
    /**
     * Indica si debe mostrarse el toast de reconexión
     * Consumir este flag y resetearlo después de mostrar el toast
     */
    shouldShowReconnectionToast: state.wasOffline && showReconnectionToast,
  };
};

/**
 * Hook simplificado que solo retorna el estado online/offline
 */
export const useIsOnline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export default useNetworkStatus;
