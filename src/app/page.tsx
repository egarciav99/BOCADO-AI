"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeScreen from "@/components/HomeScreen";
import { useAuthStore } from "@/stores/authStore";
import { useUserProfile } from "@/hooks/useUser";
import { isProfileComplete } from "@/utils/profileValidation";

export default function Page() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const { data: profile, isLoading: profileLoading } = useUserProfile(user?.uid);

    // Auto-redirect authenticated users with complete profile to dashboard
    useEffect(() => {
        if (isLoading || profileLoading) return;
        if (isAuthenticated && isProfileComplete(profile)) {
            router.replace("/dashboard");
        }
    }, [isAuthenticated, isLoading, profileLoading, profile, router]);

    return (
        <HomeScreen
            onStartRegistration={() => router.push("/register")}
            onGoToApp={() => router.push("/dashboard")}
            onGoToLogin={() => router.push("/login")}
        />
    );
}
