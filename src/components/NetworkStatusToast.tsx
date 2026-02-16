import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { logger } from '../utils/logger';
import { useTranslation } from '../contexts/I18nContext';

/**
 * Componente Toast para mostrar notificaciones de estado de red
 * Se muestra automáticamente cuando se pierde o recupera la conexión
 */
export const NetworkStatusToast: React.FC = () => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'online' | 'offline'>('online');
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  const { isOnline, isOffline, wasOffline } = useNetworkStatus({
    showReconnectionToast: true,
    onOffline: () => {
      setToastMessage(t('network.offline'));
      setToastType('offline');
      setShowToast(true);
      
      // Limpiar timeout anterior
      if (hideTimeout) clearTimeout(hideTimeout);
      
      // Ocultar después de 4 segundos
      const timeout = setTimeout(() => setShowToast(false), 4000);
      setHideTimeout(timeout);
      
      logger.info('NetworkStatusToast: Mostrando offline');
    },
    onOnline: () => {
      if (wasOffline) {
        setToastMessage(t('network.online'));
        setToastType('online');
        setShowToast(true);
        
        // Limpiar timeout anterior
        if (hideTimeout) clearTimeout(hideTimeout);
        
        // Ocultar después de 3 segundos
        const timeout = setTimeout(() => setShowToast(false), 3000);
        setHideTimeout(timeout);
        
        logger.info('NetworkStatusToast: Mostrando online');
      }
    },
  });

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [hideTimeout]);

  if (!showToast) return null;

  const bgColor = toastType === 'online' 
    ? 'bg-bocado-green' 
    : 'bg-amber-500';

  const icon = toastType === 'online' ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  return (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                  ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg
                  flex items-center gap-3 min-w-[200px] justify-center
                  animate-in slide-in-from-top-2 fade-in duration-300
                  transition-all duration-300`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span className="font-medium text-sm">{toastMessage}</span>
    </div>
  );
};

export default NetworkStatusToast;
