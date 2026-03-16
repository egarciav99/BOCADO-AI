"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PermissionsScreen from "@/components/PermissionsScreen";
import RegistrationMethodScreen from "@/components/RegistrationMethodScreen";
import RegistrationFlow from "@/components/RegistrationFlow";

type RegisterStep = "permissions" | "method" | "form";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<RegisterStep>("permissions");

    if (step === "permissions") {
        return (
            <PermissionsScreen
                onAccept={() => setStep("method")}
                onGoHome={() => router.push("/")}
            />
        );
    }

    if (step === "method") {
        return (
            <RegistrationMethodScreen
                onGoogleSuccess={(_uid, _email) => {
                    router.push("/dashboard?tutorial=true");
                }}
                onChooseEmail={() => setStep("form")}
                onGoHome={() => router.push("/")}
            />
        );
    }

    return (
        <RegistrationFlow
            onRegistrationComplete={() => router.push("/dashboard?tutorial=true")}
            onGoHome={() => router.push("/")}
        />
    );
}
