import React, { useState, useEffect } from "react";
import { useTranslation } from "../contexts/I18nContext";

interface FirstTimeUserTutorialQuickRecipeProps {
  onDismiss: () => void;
  isVisible: boolean;
}

/**
 * Tutorial first-time-user para explicar el FAB de Receta Rápida
 * Se muestra solo una vez (almacenado en localStorage)
 */
const FirstTimeUserTutorialQuickRecipe: React.FC<
  FirstTimeUserTutorialQuickRecipeProps
> = ({ onDismiss, isVisible }) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya vió el tutorial
    const hasSeenTutorial = localStorage.getItem(
      "hasSeenQuickRecipeTutorial"
    );
    if (hasSeenTutorial) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("hasSeenQuickRecipeTutorial", "true");
    setDismissed(true);
    onDismiss();
  };

  // No mostrar si ya fue visto o no está visible
  if (dismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[51] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">⚡</div>
          <h2 className="text-xl font-bold text-bocado-dark-gray dark:text-white">
            {t("quickRecipe.tutorial.title") ||
              "¡Receta Rápida!"}
          </h2>
        </div>

        {/* Contenido */}
        <div className="space-y-4">
          <p className="text-bocado-dark-gray dark:text-gray-300 text-sm leading-relaxed">
            {t("quickRecipe.tutorial.description") ||
              "Genera una receta en segundos con los ingredientes que tengas a mano."}
          </p>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-bocado-green text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <p className="text-sm text-bocado-dark-gray dark:text-gray-300">
                {t("quickRecipe.tutorial.step1") ||
                  "Toca el botón ⚡ en la esquina inferior derecha"}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-bocado-green text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <p className="text-sm text-bocado-dark-gray dark:text-gray-300">
                {t("quickRecipe.tutorial.step2") ||
                  "Escribe o selecciona los ingredientes (mín. 2)"}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-bocado-green text-white flex items-center justify-center text-xs font-bold">
                3
              </div>
              <p className="text-sm text-bocado-dark-gray dark:text-gray-300">
                {t("quickRecipe.tutorial.step3") ||
                  "¡Listo! Recibirás una receta personalizada al instante"}
              </p>
            </div>
          </div>

          {/* Benefit Highlight */}
          <div className="bg-bocado-green/10 dark:bg-bocado-green/20 border border-bocado-green/20 dark:border-bocado-green/40 rounded-2xl p-3 mt-4">
            <p className="text-xs text-bocado-dark-green dark:text-bocado-green font-semibold">
              💡 {t("quickRecipe.tutorial.benefit") ||
                "Sin llenar despensa, sin esperar: recetas en segundos"}
            </p>
          </div>
        </div>

        {/* Buttons - Styled consistently with app design */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-bocado-green hover:bg-bocado-dark-green text-white font-bold py-3 px-4 rounded-2xl shadow-bocado transition active:scale-95"
          >
            {t("quickRecipe.tutorial.gotItButton") || "¡Entendido!"}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 border-2 border-bocado-green text-bocado-green hover:bg-bocado-background/50 dark:hover:bg-gray-700 font-bold py-3 px-4 rounded-2xl transition active:scale-95"
          >
            {t("quickRecipe.tutorial.dontShowButton") || "No mostrar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstTimeUserTutorialQuickRecipe;
