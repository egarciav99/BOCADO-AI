import React from "react";
import { useTranslation } from "../contexts/I18nContext";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  isCompleted?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  isCompleted = false,
}) => {
  const { t } = useTranslation();
  
  // Progress calculation: isCompleted → 100%, otherwise step/total * 100
  const percentage = isCompleted 
    ? 100 
    : Math.round((currentStep / totalSteps) * 100);

  // Step names for better UX
  const stepNames: Record<number, string> = {
    1: t("progressBar.stepPersonal"),
    2: t("progressBar.stepHealth"),
    3: t("progressBar.stepLifestyle"),
  };

  const stepLabel = isCompleted 
    ? t("progressBar.stepDone")
    : `${t("progressBar.step", { current: currentStep, total: totalSteps })} · ${stepNames[currentStep] || ""}`;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2 text-xs font-bold text-bocado-dark-gray dark:text-gray-200 uppercase tracking-wider">
        <span>{stepLabel}</span>
      </div>
      <div className="w-full bg-bocado-background dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={stepLabel}
          className="h-full rounded-full transition-all duration-500 ease-out bg-bocado-green"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
