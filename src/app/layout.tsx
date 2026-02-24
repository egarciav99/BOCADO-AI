import type { Metadata, Viewport } from "next";
import "@/index.css";
import { Providers } from "./providers";
import PWABanner from "@/components/PWABanner";
import NetworkStatusToast from "@/components/NetworkStatusToast";

export const metadata: Metadata = {
    title: "Bocado - Guía Nutricional",
    description: "Bocado - Tu guía nutricional inteligente con recomendaciones personalizadas",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Bocado",
    },
};

export const viewport: Viewport = {
    themeColor: "#4A7C59",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className="bg-bocado-cream dark:bg-gray-900">
                <Providers>
                    <div className="min-h-[100dvh] bg-bocado-cream dark:bg-gray-900 flex justify-center items-start md:items-center md:p-8 lg:p-10 2xl:p-12">
                        <div
                            className="w-full h-[100dvh] md:h-[min(900px,calc(100dvh-4rem))] md:min-h-[640px] bg-bocado-background dark:bg-gray-800 
                md:max-w-app lg:max-w-app-lg xl:max-w-app-xl
                md:rounded-4xl md:shadow-bocado-lg 
                md:border-8 md:border-white dark:md:border-gray-700
                overflow-visible relative flex flex-col"
                        >
                            <PWABanner />
                            <NetworkStatusToast />
                            <div className="flex-1 min-h-0">
                                {children}
                            </div>
                        </div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
