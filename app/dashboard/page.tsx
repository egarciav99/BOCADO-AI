"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainApp from "@/components/MainApp";

export default function DashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showTutorial = searchParams.get("tutorial") === "true";
    const [isNewUser, setIsNewUser] = useState(showTutorial);

    return (
        <MainApp
            showTutorial={isNewUser}
            onPlanGenerated={(id) => router.push(`/plan/${id}`)}
            onTutorialFinished={() => setIsNewUser(false)}
            onLogoutComplete={() => router.push("/")}
        />
    );
}
