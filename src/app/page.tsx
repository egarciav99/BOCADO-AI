"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeScreen from "@/components/HomeScreen";
import { useAuthStore, selectIsAuthenticated, selectIsLoading, selectUserUid } from "@/stores/authStore";
import { useUserProfile } from "@/hooks/useUser";
import { isProfileComplete } from "@/utils/profileValidation";

export default function Page() {
    const router = useRouter();
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const isLoading = useAuthStore(selectIsLoading);
    const uid = useAuthStore(selectUserUid);
    const { data: profile, isLoading: profileLoading } = useUserProfile(uid);

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
