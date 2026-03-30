import React from "react";
import { Zone, KitchenItem } from "../types";
import { usePantry } from "../hooks/usePantry";
import { useUserProfile } from "../hooks/useUser";
import { usePantryStore } from "../stores/pantryStore";
import { PantryZoneSelector, PantryZoneDetail } from "./pantry";
import { PantrySkeleton } from "./skeleton";
import { useTranslation } from "../contexts/I18nContext";

interface PantryScreenProps {
  userUid: string;
}

export const PantryScreen: React.FC<PantryScreenProps> = ({ userUid }) => {
  const { t } = useTranslation();
  const { activeZone, setActiveZone } = usePantryStore();
  const { data: profile } = useUserProfile(userUid);

  const {
    inventory,
    isLoading,
    isSaving,
    refetch,
    addItem,
    deleteItem,
    updateItem,
  } = usePantry(userUid);

  // TODO: tipar inventory como KitchenItem[] directamente en usePantry
  const typedInventory = inventory as KitchenItem[];

  if (isLoading) {
    return <PantrySkeleton showDetail={!!activeZone} />;
  }

  // ✅ FIX: mostrar estado vacío con opción de reintentar si inventory es null/undefined
  if (!typedInventory) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-sm text-bocado-gray">
            {t("pantry.loadError")}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-bocado-green font-semibold hover:underline"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (!activeZone) {
    return (
      <PantryZoneSelector
        inventory={typedInventory}
        onSelectZone={setActiveZone}
      />
    );
  }

  return (
    <PantryZoneDetail
      zone={activeZone}
      inventory={typedInventory}
      isSaving={isSaving}
      onBack={() => setActiveZone(null)}
      onAddItem={addItem}
      onDeleteItem={deleteItem}
      onUpdateItem={updateItem}
      userAllergies={profile?.allergies || []}
      userOtherAllergies={profile?.otherAllergies || ""}
    />
  );
};

export default PantryScreen;