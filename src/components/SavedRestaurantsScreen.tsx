import React, { useState } from 'react';
import { useSavedItems, useToggleSavedItem } from '../hooks/useSavedItems';
import { useAuthStore } from '../stores/authStore';
import { LocationIcon } from './icons/LocationIcon';
import MealCard from './MealCard';
import { Meal } from '../types';

const SavedRestaurantsScreen: React.FC = () => {
  const [mealToConfirmDelete, setMealToConfirmDelete] = useState<Meal | null>(null);
  
  const { user } = useAuthStore();
  
  // ✅ TANSTACK QUERY: Datos del servidor
  const { data: restaurants = [], isLoading } = useSavedItems(user?.uid, 'restaurant');
  const toggleMutation = useToggleSavedItem();

  // Mapear a Meal[]
  const savedRestaurants: Meal[] = restaurants.map(saved => ({
    mealType: saved.mealType,
    recipe: saved.recipe
  }));

  const handleDeleteRequest = (meal: Meal) => {
    setMealToConfirmDelete(meal);
  };

  const confirmDelete = () => {
    if (!mealToConfirmDelete || !user) return;

    const isSaved = restaurants.some(r => r.recipe.title === mealToConfirmDelete.recipe.title);
    
    toggleMutation.mutate({
      userId: user.uid,
      type: 'restaurant',
      recipe: mealToConfirmDelete.recipe,
      mealType: mealToConfirmDelete.mealType,
      isSaved: true, // Está guardado, así que lo eliminamos
    });
    
    setMealToConfirmDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in">
        <div className="text-center mb-6 px-4 pt-2">
          <LocationIcon className="w-6 h-6 text-bocado-green mx-auto mb-2" />
          <h2 className="text-xl font-bold text-bocado-dark-green">Mis Lugares</h2>
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-bocado-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      <div className="text-center mb-6 px-4 pt-2">
        <LocationIcon className="w-6 h-6 text-bocado-green mx-auto mb-2" />
        <h2 className="text-xl font-bold text-bocado-dark-green">Mis Lugares</h2>
        <p className="text-xs text-bocado-gray">Restaurantes guardados</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
        {savedRestaurants.length === 0 ? (
          <div className="text-center py-12 px-6 bg-bocado-background rounded-2xl border-2 border-dashed border-bocado-border mx-4">
            <p className="text-bocado-gray text-base mb-2">Aún no has guardado lugares</p>
            <p className="text-xs text-bocado-gray/70">Dale ❤️ a los restaurantes para verlos aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedRestaurants.map((meal, index) => (
              <MealCard 
                key={meal.recipe.title + index} 
                meal={meal}
                onInteraction={(type) => {
                  if (type === 'save') handleDeleteRequest(meal);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación igual que antes... */}
      {mealToConfirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-bocado w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">🗑️</span>
            </div>
            <h3 className="text-lg font-bold text-bocado-text mb-2">¿Eliminar lugar?</h3>
            <p className="text-sm text-bocado-gray mb-6">
              "{mealToConfirmDelete.recipe.title}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMealToConfirmDelete(null)}
                className="flex-1 bg-bocado-background text-bocado-dark-gray font-bold py-3 rounded-full text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={toggleMutation.isPending}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-full text-sm disabled:opacity-50"
              >
                {toggleMutation.isPending ? '...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedRestaurantsScreen;