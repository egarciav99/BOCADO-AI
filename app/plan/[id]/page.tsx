"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import PlanScreen from "@/components/PlanScreen";

export default function PlanPage() {
    const router = useRouter();
    const params = useParams();
    const planId = params.id as string;

    return (
        <PlanScreen
            planId={planId}
            onStartNewPlan={() => router.push("/dashboard")}
        />
    );
}
