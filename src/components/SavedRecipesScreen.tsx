import React, { useState } from 'react';
import { useSavedItems, useToggleSavedItem } from '../hooks/useSavedItems';
import { useAuthStore } from '../stores/authStore';
import { BookIcon } from './icons/BookIcon';
import MealCard from './MealCard';
import { Meal } from '../types';

const SavedRecipesScreen: React.FC = () => {
  const [mealToConfirmDelete, setMealToConfirmDelete] = useState<Meal | null>(null);
  
  const { user } = useAuthStore();
  
  // ✅ TANSTACK QUERY
  const { data: recipes = [], isLoading } = useSavedItems(user?.uid, 'recipe');
  const toggleMutation = useToggleSavedItem();

  const savedMeals: Meal[] = recipes.map(saved => ({
    mealType: saved.mealType,
    recipe: saved.recipe
  }));

  const handleDeleteRequest = (meal: Meal) => {
    setMealToConfirmDelete(meal);
  };

  const confirmDelete = () => {
    if (!mealToConfirmDelete || !user) return;

    toggleMutation.mutate({
      userId: user.uid,
      type: 'recipe',
      recipe: mealToConfirmDelete.recipe,
      mealType: mealToConfirmDelete.mealType,
      isSaved: true,
    });
    
    setMealToConfirmDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in">
        <div className="text-center mb-6 px-4 pt-2">
          <BookIcon className="w-6 h-6 text-bocado-green mx-auto mb-2" />
          <h2 className="text-xl font-bold text-bocado-dark-green">Mis Recetas</h2>
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-bocado-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 px-4 pt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BookIcon className="w-6 h-6 text-bocado-green" />
          <h2 className="text-xl font-bold text-bocado-dark-green">Mis Recetas</h2>
        </div>
        <p className="text-xs text-bocado-gray">Tus platos favoritos guardados</p>
        {toggleMutation.isPending && <p className="text-[10px] text-bocado-green mt-1">Sincronizando...</p>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
        {savedMeals.length === 0 ? (
          <div className="text-center py-12 px-6 bg-bocado-background rounded-2xl border-2 border-dashed border-bocado-border mx-4">
            <p className="text-bocado-gray text-base mb-2">Aún no has guardado recetas</p>
            <p className="text-xs text-bocado-gray/70">Dale ❤️ a las recetas para verlas aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedMeals.map((meal, index) => (
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

      {/* Confirmation Modal */}
      {mealToConfirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-bocado w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">🗑️</span>
            </div>
            <h3 className="text-lg font-bold text-bocado-text mb-2">¿Eliminar receta?</h3>
            <p className="text-sm text-bocado-gray mb-6">
              Se eliminará <span className="font-semibold text-bocado-text">"{mealToConfirmDelete.recipe.title}"</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMealToConfirmDelete(null)}
                className="flex-1 bg-bocado-background text-bocado-dark-gray font-bold py-3 rounded-full text-sm hover:bg-bocado-border transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={toggleMutation.isPending}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-full text-sm hover:bg-red-600 active:scale-95 transition-colors disabled:opacity-50"
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

export default SavedRecipesScreen;