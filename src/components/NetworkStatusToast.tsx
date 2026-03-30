"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { logger } from "../utils/logger";
import { useTranslation } from "../contexts/I18nContext";

export const NetworkStatusToast: React.FC = () => {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"online" | "offline">("online");

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIX: isOnline removido — no se usa en este componente
  const { isOffline, wasOffline } = useNetworkStatus({
    showReconnectionToast: true,
    onOffline: () => {
      setToastMessage(t("network.offline"));
      setToastType("offline");
      setShowToast(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => setShowToast(false), 4000);
      logger.info("NetworkStatusToast: Mostrando offline");
    },
    onOnline: () => {
      if (wasOffline) {
        setToastMessage(t("network.online"));
        setToastType("online");
        setShowToast(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => setShowToast(false), 3000);
        logger.info("NetworkStatusToast: Mostrando online");
      }
    },
  });

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!showToast) return null;

  const bgColor = toastType === "online" ? "bg-bocado-green" : "bg-amber-500";

  // ✅ FIX: Lucide icons en vez de SVGs inline
  const Icon = toastType === "online" ? CheckCircle : AlertTriangle;

  return (
    <div
      // ✅ FIX: safe area para iOS — evita solapamiento con notch/dynamic island
      className={`fixed left-1/2 -translate-x-1/2 z-50
        top-[max(1rem,env(safe-area-inset-top))]
        ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg
        flex items-center gap-3 min-w-[200px] justify-center
        animate-in slide-in-from-top-2 fade-in duration-300
        transition-all duration-300`}
      role="status"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="font-medium text-sm">{toastMessage}</span>
    </div>
  );
};

export default NetworkStatusToast;
