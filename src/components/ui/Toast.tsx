import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, AlertCircle, Info } from "../icons";
import { useTranslation } from "../../contexts/I18nContext";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

type ToastItem = ToastOptions & { id: number };

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-600" />,
  error:   <AlertCircle className="w-5 h-5 text-red-600" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
  info:    <Info className="w-5 h-5 text-blue-600" />,
};

const STYLE_MAP: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error:   "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info:    "bg-blue-50 border-blue-200 text-blue-800",
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const fadeInRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = useCallback(() => {
    if (fadeInRef.current) clearTimeout(fadeInRef.current);
    if (autoRef.current)   clearTimeout(autoRef.current);
    if (closeRef.current)  clearTimeout(closeRef.current);
  }, []);

  useEffect(() => {
    // ✅ FIX: entrada desde arriba (-translate-y-4 → translate-y-0)
    fadeInRef.current = setTimeout(() => setIsVisible(true), 10);

    if (duration > 0) {
      autoRef.current = setTimeout(() => {
        setIsVisible(false);
        closeRef.current = setTimeout(onClose, 300);
      }, duration);
    }

    return clearAll;
  }, [duration, onClose, clearAll]);

  const handleClose = useCallback(() => {
    clearAll();
    setIsVisible(false);
    closeRef.current = setTimeout(onClose, 300);
  }, [onClose, clearAll]);

  return createPortal(
    <div
      className={`fixed top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 mx-auto max-w-sm z-[9999] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
    >
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl border-2 shadow-lg backdrop-blur-sm ${STYLE_MAP[type]}`}
        role="alert"
        aria-live={type === "error" || type === "warning" ? "assertive" : "polite"}
      >
        <div className="shrink-0">{ICON_MAP[type]}</div>
        <p className="flex-1 text-sm font-medium break-words">{message}</p>
        <button
          onClick={handleClose}
          className="shrink-0 p-1 rounded-full hover:bg-black/5 active:scale-95 transition-all"
          aria-label={t("common.close")}
          style={{ minWidth: "32px", minHeight: "32px" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
};

let toastCounter = 0;
const toastListeners = new Set<(toast: ToastItem) => void>();

export const showToast = (
  message: string,
  type: ToastType = "info",
  duration = 3000,
) => {
  const id = ++toastCounter;
  toastListeners.forEach((listener) =>
    listener({ id, message, type, duration }),
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (toast: ToastItem) => {
      setToasts((prev) => [...prev, toast]);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, removeToast };
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    // ✅ FIX: flexbox con gap en vez de marginTop con magic number
    <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 mx-auto max-w-sm z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};