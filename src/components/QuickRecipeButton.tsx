import React, { useState } from "react";
import { trackEvent } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";
import QuickRecipeModal from "./QuickRecipeModal";

interface QuickRecipeButtonProps {
  userName: string;
  onPlanGenerated: (interactionId: string) => void;
  disabled?: boolean;
  isProfileScreen?: boolean;
}

/**
 * 🚀 Botón flotante (FAB) para generar Recetas Rápidas
 * Posicionado sobre el BottomTabBar, accesible desde cualquier pantalla
 */
const QuickRecipeButton: React.FC<QuickRecipeButtonProps> = ({
  userName,
  onPlanGenerated,
  disabled = false,
  isProfileScreen = false,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const tooltipText = t("quickRecipe.tooltipDescription") || "Crea una receta en segundos con tus ingredientes";

  return (
    <>
      {/* FAB Flotante - posicionado sobre BottomTabBar (~70px) + padding safe (~20px) = 90px */}
      {/* bottom-32 (128px) = seguro margen extra para no tapar nada */}
      <div className="group fixed bottom-32 right-6 z-40 w-14 h-14">
        <button
          onClick={handleOpenModal}
          disabled={disabled}
          className="w-full h-full rounded-full bg-bocado-green hover:bg-bocado-dark-green active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-white text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed md:bottom-24"
          aria-label={t("quickRecipe.buttonTooltip") || "Generar receta rápida"}
          title={tooltipText}
        >
          ⚡
          {/* Tooltip on hover */}
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
            {/* Triangle pointer */}
            <div
              className="
              absolute w-0 h-0
              right-full top-1/2 -translate-y-1/2
              border-t-4 border-b-4 border-l-4
              border-t-transparent border-b-transparent border-l-bocado-dark-gray
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
