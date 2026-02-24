"use client";

import React from "react";
import { useRouter } from "next/navigation";
import HomeScreen from "@/components/HomeScreen";

export default function Page() {
    const router = useRouter();

    return (
        <HomeScreen
            onStartRegistration={() => router.push("/register")}
            onGoToApp={() => router.push("/dashboard")}
            onGoToLogin={() => router.push("/login")}
        />
    );
}
