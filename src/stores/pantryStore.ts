// stores/pantryStore.ts
import { create } from 'zustand';
import { Zone } from '../types';

/**
 * Store de Zustand SOLO para estado UI de la despensa.
 * Los datos de Firebase se manejan con TanStack Query en usePantry hook.
 */
interface PantryUIState {
  // Estado de navegación UI
  activeZone: Zone | null;
  activeCategory: string;
  
  // Actions
  setActiveZone: (zone: Zone | null) => void;
  setActiveCategory: (category: string) => void;
  reset: () => void;
}

const initialState = {
  activeZone: null,
  activeCategory: 'Todos',
};

export const usePantryStore = create<PantryUIState>((set) => ({
  ...initialState,
  
  setActiveZone: (zone) => set({ activeZone: zone }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  reset: () => set(initialState),
}));