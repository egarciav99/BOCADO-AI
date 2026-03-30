import React, { useState } from "react";
import { trackEvent } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";
import QuickRecipeModal from "./QuickRecipeModal";
import FirstTimeUserTutorialQuickRecipe from "./FirstTimeUserTutorialQuickRecipe";

interface QuickRecipeButtonProps {
  userName: string;
  onPlanGenerated: (interactionId: string) => void;
  disabled?: boolean;
  isProfileScreen?: boolean;
}

const QuickRecipeButton: React.FC<QuickRecipeButtonProps> = ({
  userName,
  onPlanGenerated,
  disabled = false,
  isProfileScreen = false,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ Tutorial vive aquí — fuente de verdad única
  // Inicialización lazy para no bloquear el render con localStorage
  const [showTutorial, setShowTutorial] = useState(() => {
    if (isProfileScreen) return false; // nunca en la pantalla de perfil
    try {
      return !localStorage.getItem("hasSeenQuickRecipeTutorial");
    } catch {
      return true;
    }
  });

  const handleDismissTutorial = () => {
    try {
      localStorage.setItem("hasSeenQuickRecipeTutorial", "true");
    } catch (e) {
      console.warn("Failed to save tutorial preference:", e);
    }
    setShowTutorial(false);
  };

  const handleOpenModal = () => {
    if (disabled) return;
    trackEvent("quick_recipe_button_clicked");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleRecipeGenerated = (interactionId: string) => {
    setIsModalOpen(false);
    onPlanGenerated(interactionId);
  };

  const tooltipText = t("quickRecipe.tooltipDescription");

  return (
    <>
      {/* Tutorial — se muestra antes de que el modal se abra, nunca lo bloquea */}
      {/* ✅ No renderizar en pantalla de perfil */}
      {!isProfileScreen && (
        <FirstTimeUserTutorialQuickRecipe
          isVisible={showTutorial && !isModalOpen}
          onDismiss={handleDismissTutorial}
        />
      )}

      {/* ✅ FIX: responsive bottom en el div contenedor, no en el button */}
      <div className="group fixed bottom-32 md:bottom-24 right-6 z-40 w-14 h-14">
        <button
          onClick={handleOpenModal}
          disabled={disabled}
          className="w-full h-full rounded-full bg-bocado-green hover:bg-bocado-dark-green active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-white text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("quickRecipe.buttonTooltip")}
          // ✅ Sin title — el tooltip custom es suficiente
        >
          ⚡

          {/* Tooltip custom */}
          <div
            className="
              absolute right-full top-1/2 -translate-y-1/2 mr-2
              invisible group-hover:visible
              opacity-0 group-hover:opacity-100
              transition-opacity duration-200
              bg-bocado-dark-gray text-white text-xs
              px-3 py-1.5 rounded-lg
              whitespace-nowrap z-50
              pointer-events-none
            "
          >
            {tooltipText}
            <div
              className="
                absolute left-full top-1/2 -translate-y-1/2
                border-t-4 border-b-4 border-l-4
                border-t-transparent border-b-transparent
                border-l-bocado-dark-gray
              "
            />
          </div>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <QuickRecipeModal
          userName={userName}
          onClose={handleCloseModal}
          onRecipeGenerated={handleRecipeGenerated}
          isProfileScreen={isProfileScreen}
        />
      )}
    </>
  );
};

export default QuickRecipeButton;
