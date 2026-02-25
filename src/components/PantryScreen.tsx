// components/PantryScreen.tsx
import React from "react";
import { Zone, KitchenItem } from "../types";
import { usePantry } from "../hooks/usePantry";
import { usePantryStore } from "../stores/pantryStore";
import { PantryZoneSelector, PantryZoneDetail } from "./pantry";
import { PantrySkeleton } from "./skeleton";

interface PantryScreenProps {
  userUid: string;
}

export const PantryScreen: React.FC<PantryScreenProps> = ({ userUid }) => {
  // Estado UI con Zustand (solo estado local de la interfaz)
  const { activeZone, setActiveZone } = usePantryStore();

  // Datos y operaciones con TanStack Query (sincronización con Firebase)
  const { inventory, isLoading, isSaving, addItem, deleteItem, updateItem } =
    usePantry(userUid);
  const typedInventory = inventory as KitchenItem[];

  if (isLoading) {
    return <PantrySkeleton showDetail={!!activeZone} />;
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
    />
  );
};

export default PantryScreen;
