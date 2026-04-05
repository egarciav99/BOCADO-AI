"use client";

import { useEffect } from "react";
import { useTranslation } from "@/contexts/I18nContext";
import { logger } from "@/utils/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PlanError({ error, reset }: ErrorProps) {
  const { t } = useTranslation();

  useEffect(() => {
    logger.error("[Plan] Segment error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <div className="space-y-4 max-w-sm">
        <p className="text-2xl">🥗</p>
        <h2 className="text-lg font-bold text-bocado-dark-green">
          {t("errorBoundary.title")}
        </h2>
        <p className="text-sm text-bocado-gray">
          {t("errorBoundary.message")}
        </p>
        <button
          onClick={reset}
          className="w-full bg-bocado-green text-white font-bold py-3 rounded-full active:scale-95 transition-transform"
        >
          {t("errorBoundary.retry")}
        </button>
      </div>
    </div>
  );
}
