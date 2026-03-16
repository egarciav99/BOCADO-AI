"use client";

import React from "react";
import { useTranslation } from "@/contexts/I18nContext";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-bocado-dark-green dark:text-gray-200 mb-2">
                {t("errors.unexpected") || "Algo salió mal"}
            </h1>
            <p className="text-bocado-gray dark:text-gray-400 mb-6">
                {t("errors.unexpectedDesc") || "Ocurrió un error inesperado. Por favor intenta de nuevo."}
            </p>
            <button
                onClick={() => reset()}
                className="bg-bocado-green text-white px-6 py-3 rounded-full font-bold hover:bg-bocado-dark-green transition-colors"
            >
                {t("common.retry") || "Reintentar"}
            </button>
        </div>
    );
}
