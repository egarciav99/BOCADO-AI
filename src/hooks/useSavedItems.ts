import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Recipe, SavedItem, SavedItemType } from '../types';
import { useEffect } from 'react';

const SAVED_RECIPES_KEY = 'savedRecipes';
const SAVED_RESTAURANTS_KEY = 'savedRestaurants';

// ==========================================
// FETCH
// ==========================================
const fetchSavedItems = async (
  userId: string, 
  type: SavedItemType
): Promise<SavedItem[]> => {
  const collectionName = type === 'recipe' ? 'saved_recipes' : 'saved_restaurants';
  const q = query(collection(db, collectionName), where('user_id', '==', userId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((docSnap): SavedItem => ({
    id: docSnap.id,
    type,
    recipe: docSnap.data().recipe as Recipe,
    mealType: docSnap.data().mealType || 'Guardado',
    userId: docSnap.data().user_id,
    savedAt: docSnap.data().savedAt?.toMillis?.() || Date.now(),
  }));
};

// ==========================================
// HOOK PRINCIPAL
// ==========================================
export const useSavedItems = (
  userId: string | undefined, 
  type: SavedItemType
): UseQueryResult<SavedItem[], Error> => {
  const queryClient = useQueryClient();
  const key = type === 'recipe' ? SAVED_RECIPES_KEY : SAVED_RESTAURANTS_KEY;

  const queryResult = useQuery({
    queryKey: [key, userId],
    queryFn: () => fetchSavedItems(userId!, type),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Suscripción realtime
  useEffect(() => {
    if (!userId) return;
    
    const collectionName = type === 'recipe' ? 'saved_recipes' : 'saved_restaurants';
    const q = query(collection(db, collectionName), where('user_id', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const items: SavedItem[] = snapshot.docs.map((docSnap): SavedItem => ({
        id: docSnap.id,
        type,
        recipe: docSnap.data().recipe as Recipe,
        mealType: docSnap.data().mealType || 'Guardado',
        userId: docSnap.data().user_id,
        savedAt: docSnap.data().savedAt?.toMillis?.() || Date.now(),
      }));
      
      queryClient.setQueryData([key, userId], items);
    });

    return () => unsubscribe();
  }, [userId, type, queryClient, key]);

  return queryResult;
};

// ==========================================
// MUTATIONS
// ==========================================
export const useToggleSavedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      recipe,
      mealType,
      isSaved
    }: {
      userId: string;
      type: SavedItemType;
      recipe: Recipe;
      mealType: string;
      isSaved: boolean;
    }) => {
      const collectionName = type === 'recipe' ? 'saved_recipes' : 'saved_restaurants';
      const docId = `${userId}_${recipe.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      const docRef = doc(db, collectionName, docId);

      if (isSaved) {
        await deleteDoc(docRef);
        return { action: 'removed' as const, type, recipe };
      } else {
        await setDoc(docRef, {
          user_id: userId,
          recipe,
          mealType,
          savedAt: serverTimestamp(),
        });
        return { action: 'added' as const, type, recipe };
      }
    },
    
    onMutate: async ({ userId, type, recipe, isSaved }) => {
      const key = type === 'recipe' ? SAVED_RECIPES_KEY : SAVED_RESTAURANTS_KEY;
      await queryClient.cancelQueries({ queryKey: [key, userId] });
      
      const previousItems = queryClient.getQueryData<SavedItem[]>([key, userId]) || [];
      
      if (isSaved) {
        // Optimistic remove
        queryClient.setQueryData<SavedItem[]>(
          [key, userId],
          previousItems.filter((item: SavedItem) => item.recipe.title !== recipe.title)
        );
      } else {
        // Optimistic add
        const newItem: SavedItem = {
          id: `temp-${Date.now()}`,
          type,
          recipe,
          mealType: 'Guardado',
          userId,
          savedAt: Date.now(),
        };
        queryClient.setQueryData<SavedItem[]>([key, userId], [newItem, ...previousItems]);
      }
      
      return { previousItems };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        const key = variables.type === 'recipe' ? SAVED_RECIPES_KEY : SAVED_RESTAURANTS_KEY;
        queryClient.setQueryData([key, variables.userId], context.previousItems);
      }
    },
    
    onSettled: (data, error, variables) => {
      const key = variables.type === 'recipe' ? SAVED_RECIPES_KEY : SAVED_RESTAURANTS_KEY;
      queryClient.invalidateQueries({ queryKey: [key, variables.userId] });
    },
  });
};

// ==========================================
// CHECK IF SAVED (helper)
// ==========================================
export const useIsItemSaved = (
  userId: string | undefined,
  type: SavedItemType,
  title: string
): boolean => {
  const key = type === 'recipe' ? SAVED_RECIPES_KEY : SAVED_RESTAURANTS_KEY;
  const { data: items } = useQuery<SavedItem[]>({
    queryKey: [key, userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
  
  return (items || []).some((item: SavedItem) => item.recipe.title === title);
};