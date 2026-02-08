import React, { useState } from 'react';
import { Meal } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { HeartIcon } from './icons/HeartIcon';
import FeedbackModal from './FeedbackModal';
import { useToggleSavedItem, useIsItemSaved } from '../hooks/useSavedItems';
import { useAuthStore } from '../stores/authStore';
import { trackEvent } from '../firebaseConfig';

interface MealCardProps {
  meal: Meal;
  onInteraction?: (type: 'expand' | 'save' | 'feedback', data?: any) => void;
}

const getSmartEmoji = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('pollo')) return '🍗';
  if (lower.includes('pescado') || lower.includes('salmon')) return '🐟';
  if (lower.includes('carne') || lower.includes('res')) return '🥩';
  if (lower.includes('ensalada')) return '🥗';
  if (lower.includes('pasta')) return '🍝';
  if (lower.includes('taco')) return '🌮';
  if (lower.includes('huevo')) return '🍳';
  if (lower.includes('sopa')) return '🍲';
  return '🍽️';
};

const getDifficultyStyle = (difficulty: string): string => {
  switch (difficulty) {
    case 'Fácil':
      return 'bg-green-100 text-green-700';
    case 'Media':
      return 'bg-yellow-100 text-yellow-700';
    case 'Difícil':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-bocado-background text-bocado-dark-gray';
  }
};

const MealCard: React.FC<MealCardProps> = ({
  meal,
  onInteraction,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const { user } = useAuthStore();
  const toggleMutation = useToggleSavedItem();
  
  const { recipe } = meal;
  const isRestaurant = recipe.difficulty === 'Restaurante';
  const type = isRestaurant ? 'restaurant' : 'recipe';
  
  const saved = useIsItemSaved(user?.uid, type, recipe.title);
  
  const emoji = getSmartEmoji(recipe.title);
  const showSavings = recipe.savingsMatch && recipe.savingsMatch !== 'Ninguno';

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    trackEvent(saved ? 'recipe_unsaved' : 'recipe_saved', {
      item_title: recipe.title,
      type: type,
      userId: user.uid
    });

    toggleMutation.mutate({
      userId: user.uid,
      type,
      recipe,
      mealType: meal.mealType,
      isSaved: saved,
    });
    
    onInteraction?.('save', { 
      recipe: recipe.title, 
      isSaved: !saved, 
      isRestaurant 
    });
  };

  const handleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (newState) {
      trackEvent('recipe_expanded', {
        item_title: recipe.title,
        type: type,
        is_restaurant: isRestaurant
      });
      onInteraction?.('expand', { recipe: recipe.title });
    }
  };

  const handleFeedbackOpen = () => {
    trackEvent('feedback_button_click', {
        item_title: recipe.title,
        type: type
    });
    setShowFeedback(true);
    onInteraction?.('feedback', { recipe: recipe.title });
  };

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recipe.link_maps) {
      trackEvent('restaurant_maps_clicked', {
        restaurant: recipe.title,
        url: recipe.link_maps
      });
      window.open(recipe.link_maps, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="group border border-bocado-border rounded-2xl bg-white transition-all duration-200 hover:shadow-bocado active:scale-[0.99]">
      
      {/* HEADER */}
      <div
        className="p-4 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex justify-between items-start gap-3">
          
          <div className="flex gap-3 flex-1 min-w-0">
            <span className="text-2xl shrink-0 leading-none" role="img" aria-label="Tipo de comida">
              {emoji}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-bocado-text leading-tight group-hover:text-bocado-green transition-colors line-clamp-2">
                {recipe.title}
              </h3>

              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {isRestaurant && recipe.cuisine && (
                  <span className="px-2 py-1 bg-bocado-green/10 text-bocado-green rounded-lg font-bold">
                    {recipe.cuisine}
                  </span>
                )}

                {!isRestaurant && (
                  <span className="px-2 py-1 bg-bocado-background text-bocado-dark-gray rounded-lg font-medium">
                    ⏱️ {recipe.time}
                  </span>
                )}

                {recipe.calories !== 'N/A' && (
                  <span className="px-2 py-1 bg-bocado-background text-bocado-dark-gray rounded-lg font-medium">
                    🔥 {recipe.calories}
                  </span>
                )}

                {!isRestaurant && recipe.difficulty && recipe.difficulty !== 'N/A' && (
                  <span className={`px-2 py-1 rounded-lg font-medium ${getDifficultyStyle(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                )}
              </div>

              {showSavings && (
                <span className="inline-block mt-2 text-xs font-medium text-bocado-green bg-bocado-green/10 px-2 py-1 rounded-lg">
                  ✨ Usa ingredientes que ya tienes
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={handleSaveClick}
              disabled={toggleMutation.isPending}
              className={`p-2 rounded-full transition-all active:scale-90 disabled:opacity-50 ${
                saved ? 'text-red-500' : 'text-bocado-gray hover:text-red-400'
              }`}
            >
              <HeartIcon className="w-6 h-6" filled={saved} />
            </button>

            <ChevronDownIcon
              className={`w-5 h-5 text-bocado-gray transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-bocado-border space-y-4 animate-fade-in">
          
          {/* Botón de Google Maps para restaurantes */}
          {isRestaurant && recipe.link_maps && (
            <div className="mb-3">
              <button
                onClick={handleOpenMaps}
                className="w-full py-3 rounded-xl bg-blue-50 text-blue-600 font-semibold text-sm border border-blue-200 hover:bg-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>📍</span>
                <span>Ver ubicación en Google Maps</span>
              </button>
              {recipe.direccion_aproximada && (
                <p className="text-xs text-bocado-gray text-center mt-2 px-2">
                  {recipe.direccion_aproximada}
                </p>
              )}
            </div>
          )}

          {/* Campos específicos de restaurante */}
          {isRestaurant && (
            <div className="space-y-3">
              {recipe.plato_sugerido && (
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">
                    🍽️ Plato sugerido
                  </h4>
                  <p className="text-sm text-bocado-text">{recipe.plato_sugerido}</p>
                </div>
              )}

              {recipe.por_que_es_bueno && (
                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                  <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">
                    ✨ Por qué es bueno
                  </h4>
                  <p className="text-sm text-bocado-text">{recipe.por_que_es_bueno}</p>
                </div>
              )}

              {recipe.hack_saludable && (
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
                    💡 Hack saludable
                  </h4>
                  <p className="text-sm text-bocado-text">{recipe.hack_saludable}</p>
                </div>
              )}
            </div>
          )}

          {/* Ingredientes (solo para recetas en casa) */}
          {!isRestaurant && recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-bocado-dark-gray uppercase tracking-wider mb-2">
                Ingredientes
              </h4>
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing, index) => (
                  <li key={index} className="text-sm text-bocado-text flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-bocado-green rounded-full mt-1.5 shrink-0"></span>
                    <span className="leading-relaxed">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preparación (solo para recetas en casa) */}
          {!isRestaurant && recipe.instructions && recipe.instructions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-bocado-dark-gray uppercase tracking-wider mb-2">
                Preparación
              </h4>
              <div className="space-y-2">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="flex gap-2 text-sm text-bocado-text">
                    <span className="text-bocado-green font-bold shrink-0">{i + 1}.</span>
                    <p className="leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón de feedback */}
          <button
            onClick={handleFeedbackOpen}
            className="w-full py-3 rounded-xl bg-bocado-dark-green text-white font-semibold text-sm shadow-bocado hover:bg-bocado-green active:scale-[0.98] transition-all"
          >
            {isRestaurant ? '📍 Fui al lugar' : '🍳 La preparé'}
          </button>
        </div>
      )}

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        itemTitle={recipe.title}
        type={isRestaurant ? 'away' : 'home'}
        originalData={recipe}
      />
    </div>
  );
};

export default MealCard;