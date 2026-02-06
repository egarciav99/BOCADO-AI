import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { LocationIcon } from './icons/LocationIcon';
import MealCard from './MealCard';
import { Meal } from '../types';

const SavedRestaurantsScreen: React.FC = () => {
  const [savedRestaurants, setSavedRestaurants] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [mealToConfirmDelete, setMealToConfirmDelete] = useState<Meal | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
        setIsLoading(false);
        return;
    }

    const q = query(
        collection(db, 'saved_restaurants'),
        where('user_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const rawDocs = snapshot.docs.map(doc => doc.data());
        
        rawDocs.sort((a, b) => {
            const timeA = a.savedAt?.seconds || 0;
            const timeB = b.savedAt?.seconds || 0;
            return timeB - timeA;
        });

        const meals: Meal[] = rawDocs.map(data => ({
            mealType: data.mealType || 'Lugar Guardado',
            recipe: data.recipe
        }));

        setSavedRestaurants(meals);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching saved restaurants:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteRequest = (meal: Meal) => {
    setMealToConfirmDelete(meal);
  };

  const confirmDelete = async () => {
    if (!mealToConfirmDelete) return;

    const { recipe } = mealToConfirmDelete;
    const user = auth.currentUser;
    if (!user) return;

    setIsDeleting(recipe.title);
    
    const sanitizedTitle = recipe.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const docId = `${user.uid}_${sanitizedTitle}`;
    const docRef = doc(db, 'saved_restaurants', docId);

    try {
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting restaurant:", error);
    } finally {
        setIsDeleting(null);
        setMealToConfirmDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 px-4 pt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <LocationIcon className="w-6 h-6 text-bocado-green" />
          <h2 className="text-xl font-bold text-bocado-dark-green">Mis Lugares</h2>
        </div>
        <p className="text-xs text-bocado-gray">Restaurantes guardados</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-bocado-green border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : savedRestaurants.length === 0 ? (
          <div className="text-center py-12 px-6 bg-bocado-background rounded-2xl border-2 border-dashed border-bocado-border mx-4">
            <p className="text-bocado-gray text-base mb-2">Aún no has guardado lugares</p>
            <p className="text-xs text-bocado-gray/70">Dale ❤️ a los restaurantes para verlos aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedRestaurants.map((meal, index) => (
              <MealCard 
                key={index} 
                meal={meal}
                isSaved={true}
                isSaving={isDeleting === meal.recipe.title}
                onToggleSave={() => handleDeleteRequest(meal)}
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
            <h3 className="text-lg font-bold text-bocado-text mb-2">¿Eliminar lugar?</h3>
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
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-full text-sm hover:bg-red-600 active:scale-95 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedRestaurantsScreen;