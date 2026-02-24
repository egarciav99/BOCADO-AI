"use client";

import React from "react";
import { useRouter } from "next/navigation";
import RegistrationFlow from "@/components/RegistrationFlow";

export default function RegisterPage() {
    const router = useRouter();

    return (
        <RegistrationFlow
            onRegistrationComplete={() => router.push("/dashboard")}
            onGoHome={() => router.push("/")}
        />
    );
}
