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

  return (
    <>
      {/* FAB Flotante - posicionado sobre BottomTabBar (~70px) + padding safe (~20px) = 90px */}
      {/* bottom-32 (128px) = seguro margen extra para no tapar nada */}
      <button
        onClick={handleOpenModal}
        disabled={disabled}
        className="fixed bottom-32 right-6 z-40 w-14 h-14 rounded-full bg-bocado-green hover:bg-bocado-dark-green active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-white text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed md:bottom-24"
        title={t("quickRecipe.buttonTooltip") || "Receta Rápida"}
        aria-label={t("quickRecipe.buttonTooltip") || "Generar receta rápida"}
      >
        ⚡
      </button>

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
