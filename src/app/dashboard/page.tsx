"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainApp from "@/components/MainApp";
import ProtectedRoute from "@/components/ProtectedRoute";

// Inner component that uses useSearchParams — must be inside <Suspense>
function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showTutorial = searchParams?.get("tutorial") === "true";
    const [isNewUser, setIsNewUser] = useState(showTutorial);

    return (
        <ProtectedRoute redirectTo="/login">
            <MainApp
                showTutorial={isNewUser}
                onPlanGenerated={(id) => router.push(`/plan/${id}`)}
                onTutorialFinished={() => setIsNewUser(false)}
                onLogoutComplete={() => router.push("/")}
            />
        </ProtectedRoute>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={null}>
            <DashboardContent />
        </Suspense>
    );
}
