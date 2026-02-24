"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/contexts/I18nContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FeedbackModalProvider } from "@/components/FeedbackModal";
import { ToastContainer } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <I18nProvider>
                    <FeedbackModalProvider>
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                        <ToastContainer />
                    </FeedbackModalProvider>
                </I18nProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
