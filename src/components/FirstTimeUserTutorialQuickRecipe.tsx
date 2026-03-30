import React from "react";
import { useTranslation } from "../contexts/I18nContext";

interface FirstTimeUserTutorialQuickRecipeProps {
  onDismiss: () => void;
  isVisible: boolean;
}

const FirstTimeUserTutorialQuickRecipe = ({
  onDismiss,
  isVisible,
}: FirstTimeUserTutorialQuickRecipeProps): React.ReactElement | null => {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[51] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">⚡</div>
          <h2 className="text-xl font-bold text-bocado-dark-gray dark:text-white">
            {t("quickRecipe.tutorial.title")}
          </h2>
        </div>

        {/* Descripción */}
        <p className="text-bocado-dark-gray dark:text-gray-300 text-sm leading-relaxed mb-4">
          {t("quickRecipe.tutorial.description")}
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-bocado-green text-white flex items-center justify-center text-xs font-bold">
                {step}
              </div>
              <p className="text-sm text-bocado-dark-gray dark:text-gray-300">
                {t(`quickRecipe.tutorial.step${step}`)}
              </p>
            </div>
          ))}
        </div>

        {/* Benefit */}
        <div className="bg-bocado-green/10 dark:bg-bocado-green/20 border border-bocado-green/20 dark:border-bocado-green/40 rounded-2xl p-3 mb-6">
          <p className="text-xs text-bocado-dark-green dark:text-bocado-green font-semibold">
            💡 {t("quickRecipe.tutorial.benefit")}
          </p>
        </div>

        {/* Botón único */}
        <button
          onClick={onDismiss}
          className="w-full bg-bocado-green hover:bg-bocado-dark-green text-white font-bold py-3 px-4 rounded-2xl shadow-bocado transition active:scale-95"
        >
          {t("quickRecipe.tutorial.gotItButton")}
        </button>
      </div>
    </div>
  );
};

export default FirstTimeUserTutorialQuickRecipe;
