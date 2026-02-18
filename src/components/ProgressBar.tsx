import React from "react";
import { useTranslation } from "../contexts/I18nContext";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  const { t } = useTranslation();
  const percentage = Math.min(
    ((currentStep - 1) / (totalSteps - 1)) * 100,
    100,
  );

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2 text-xs font-bold text-bocado-dark-gray uppercase tracking-wider">
        <span>
          {t("progressBar.step", { current: currentStep, total: totalSteps })}
        </span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-bocado-background rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out bg-bocado-green"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
