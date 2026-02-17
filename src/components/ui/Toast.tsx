import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info } from '../icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-600" />,
  error: <AlertCircle className="w-5 h-5 text-red-600" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
  info: <Info className="w-5 h-5 text-blue-600" />,
};

const STYLE_MAP: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

/**
 * Toast component - Mobile-friendly notification
 * ✅ Fixes #1: Replace alert() with proper toast notifications
 */
export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return createPortal(
    <div
      className={`fixed top-safe left-4 right-4 mx-auto max-w-sm z-[9999] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-4' : 'opacity-0 translate-y-0'
      }`}
      style={{ 
        touchAction: 'none',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div 
        className={`flex items-center gap-3 p-4 rounded-2xl border-2 shadow-lg backdrop-blur-sm ${STYLE_MAP[type]}`}
        role="alert"
        aria-live="polite"
      >
        <div className="shrink-0">{ICON_MAP[type]}</div>
        <p className="flex-1 text-sm font-medium break-words">{message}</p>
        <button
          onClick={handleClose}
          className="shrink-0 p-1 rounded-full hover:bg-black/5 active:scale-95 transition-all"
          aria-label="Cerrar"
          style={{ minWidth: '32px', minHeight: '32px' }} // Touch-friendly
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
};

// Toast manager hook
interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

let toastCounter = 0;
const toastListeners = new Set<(toast: ToastOptions & { id: number }) => void>();

export const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
  const id = ++toastCounter;
  toastListeners.forEach(listener => listener({ id, message, type, duration }));
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<ToastOptions & { id: number }>>([]);

  useEffect(() => {
    const listener = (toast: ToastOptions & { id: number }) => {
      setToasts(prev => [...prev, toast]);
    };
    
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, removeToast };
};

/**
 * ToastContainer - Add to your root App component
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ marginTop: `${index * 80}px` }} // Stack toasts
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
};
