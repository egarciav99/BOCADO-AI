import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

interface PWAState {
  isInstallable: boolean;
  isOffline: boolean;
  isInstalled: boolean;
  installPrompt: Event | null;
  updateAvailable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

/**
 * Hook para manejar funcionalidades PWA
 * - Detecta si la app es instalable
 - Detecta estado offline/online
 - Maneja la instalación
 - Detecta actualizaciones disponibles
 */
export const usePWA = () => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isOffline: !navigator.onLine,
    isInstalled: false,
    installPrompt: null,
    updateAvailable: false,
    isIOS: false,
    isAndroid: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    setState(prev => ({ ...prev, isIOS, isAndroid }));
  }, []);

  // Detectar si está instalado
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone 
        || document.referrer.includes('android-app://');
      
      setState(prev => ({ ...prev, isInstalled: isStandalone }));
    };

    checkInstalled();
    
    // Escuchar cambios en display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, isInstalled: e.matches }));
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detectar instalabilidad
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e,
      }));
      logger.info('PWA: App is installable');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!state.isIOS) return;

    setState(prev => ({
      ...prev,
      isInstallable: !prev.isInstalled,
    }));
  }, [state.isIOS, state.isInstalled]);

  // Detectar online/offline
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
      logger.info('PWA: App is online');
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
      logger.info('PWA: App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detectar actualizaciones del SW
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setState(prev => ({ ...prev, updateAvailable: true }));
        logger.info('PWA: New service worker activated');
      });
    }
  }, []);

  // Función para instalar la app
  const install = useCallback(async () => {
    if (!state.installPrompt) {
      logger.warn('PWA: No install prompt available');
      return false;
    }

    try {
      const promptEvent = state.installPrompt as any;
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      
      if (result.outcome === 'accepted') {
        logger.info('PWA: App installed');
        setState(prev => ({ 
          ...prev, 
          isInstallable: false, 
          installPrompt: null,
          isInstalled: true 
        }));
        return true;
      } else {
        logger.info('PWA: Install dismissed');
        return false;
      }
    } catch (error) {
      logger.error('PWA: Error installing app', error);
      return false;
    }
  }, [state.installPrompt]);

  // Función para recargar y actualizar
  const updateApp = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().then(() => {
          window.location.reload();
        });
      });
    }
  }, []);

  return {
    ...state,
    install,
    updateApp,
  };
};

export default usePWA;
