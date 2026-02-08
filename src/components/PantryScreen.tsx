// components/PantryScreen.tsx
import React from 'react';
import { Zone, KitchenItem } from '../types';
import { usePantry } from '../hooks/usePantry';
import { usePantryStore } from '../stores/pantryStore';
import { PantryZoneSelector, PantryZoneDetail } from './pantry';

interface PantryScreenProps {
  userUid: string;
}

export const PantryScreen: React.FC<PantryScreenProps> = ({ userUid }) => {
  // Estado UI con Zustand (solo estado local de la interfaz)
  const { activeZone, setActiveZone } = usePantryStore();
  
  // Datos y operaciones con TanStack Query (sincronización con Firebase)
  const { inventory, isLoading, isSaving, addItem, deleteItem, updateItem } = usePantry(userUid);
  const typedInventory = inventory as KitchenItem[];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-bocado-green border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-bocado-gray text-sm">Cargando tu cocina...</p>
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
      onToggleFreshness={(id, newStatus) => updateItem(id, { freshness: newStatus })}
    />
  );
};

export default PantryScreen;
