import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useSavedItems, useToggleSavedItem } from "../hooks/useSavedItems";
import { useAuthStore, selectUserUid } from "../stores/authStore";
import { BookOpen } from "./icons";
import MealCard from "./MealCard";
import { Meal } from "../types";
import { RecipeListSkeleton } from "./skeleton";
import { useTranslation } from "../contexts/I18nContext";

interface SavedRecipesScreenProps {
  onNavigateToRecommendation?: () => void;
}

const SavedRecipesScreen: React.FC<SavedRecipesScreenProps> = ({
  onNavigateToRecommendation,
}) => {
  const { t } = useTranslation();
  const [mealToConfirmDelete, setMealToConfirmDelete] = useState<Meal | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const uid = useAuthStore(selectUserUid);

  const savedItems = useSavedItems(uid, "recipe");
  const recipes = savedItems.data || [];
  const isLoading = savedItems.isLoading;
  const fetchNextPage = savedItems.fetchNextPage;
  const hasNextPage = savedItems.hasNextPage;
  const isFetchingNextPage = savedItems.isFetchingNextPage;
  const totalLoaded = savedItems.totalLoaded;

  const toggleMutation = useToggleSavedItem();

  const savedMeals: Meal[] = recipes
    .filter((saved: any) => saved?.recipe?.title)
    .map((saved: any) => ({
      mealType: saved.mealType,
      recipe: saved.recipe,
    }));

  const handleDeleteRequest = (meal: Meal) => {
    setMealToConfirmDelete(meal);
  };

  const confirmDelete = () => {
    if (!mealToConfirmDelete || !uid) return;
    setDeleteError(null);

    toggleMutation.mutate(
      {
        userId: uid,
        type: "recipe",
        recipe: mealToConfirmDelete.recipe,
        mealType: mealToConfirmDelete.mealType,
        isSaved: true,
      },
      {
        onSuccess: () => {
          setMealToConfirmDelete(null);
        },
        onError: () => {
          setDeleteError(t("savedRecipes.deleteError"));
          // No cerrar el modal — dejar al usuario reintentar
        },
      },
    );
  };

  if (isLoading) {
    return <RecipeListSkeleton count={4} />;
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in relative">
      {/* Header */}
      <div className="text-center mb-6 px-4 pt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BookOpen className="w-6 h-6 text-bocado-green" />
          <h2 className="text-xl font-bold text-bocado-dark-green">
            {t("savedRecipes.title")}
          </h2>
        </div>
        <p className="text-xs text-bocado-gray">
          {t("savedRecipes.subtitle")}
          {totalLoaded > 0 && (
            <span className="ml-1 text-bocado-green font-medium">
              ({totalLoaded})
            </span>
          )}
        </p>
        {toggleMutation.isPending && (
          <p className="text-xs text-bocado-green mt-1">
            {t("savedRecipes.syncing")}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8 min-h-0">
        {savedMeals.length === 0 ? (
          <div className="text-center py-12 px-4 sm:px-6 bg-bocado-background rounded-2xl border-2 border-dashed border-bocado-border">
            <span className="text-4xl mb-4 block" aria-hidden="true">
              📚
            </span>
            <p className="text-bocado-gray font-medium mb-1">
              {t("savedRecipes.emptyState")}
            </p>
            <p className="text-xs text-bocado-gray/70 mb-4">
              {t("savedRecipes.emptyStateSubtitle")}
            </p>
            {onNavigateToRecommendation && (
              <button
                onClick={onNavigateToRecommendation}
                className="text-sm text-bocado-green font-bold active:scale-95 transition-transform"
              >
                {t("savedRecipes.goGenerate")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {savedMeals.map((meal, index) => (
              <MealCard
                // Using title+index as key — saved items don't expose a stable ID.
                // TODO: expose saved item ID from useSavedItems hook for stable keys.
                key={`${meal.recipe.title}-${index}`}
                meal={meal}
                onInteraction={(type) => {
                  if (type === "save") handleDeleteRequest(meal);
                }}
              />
            ))}

            {/* Botón Cargar Más */}
            {hasNextPage && (
              <div className="pt-4 pb-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-3 px-4 bg-bocado-background text-bocado-dark-gray font-medium rounded-xl border border-bocado-border hover:bg-bocado-border/50 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-bocado-green border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">
                        {t("savedRecipes.loading")}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm">
                      {t("savedRecipes.loadMore")}
                    </span>
                  )}
                </button>
                {savedItems.paginationError && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    {t("common.error")} —{" "}
                    <button
                      className="underline"
                      onClick={() => {
                        savedItems.clearPaginationError();
                        savedItems.fetchNextPage();
                      }}
                    >
                      {t("common.retry")}
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Mensaje de fin */}
            {!hasNextPage && savedMeals.length > 0 && (
              <p className="text-center text-xs text-bocado-gray/60 py-4">
                {t("savedRecipes.noMore")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {mealToConfirmDelete &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-bocado w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">🗑️</span>
              </div>
              <h3 className="text-lg font-bold text-bocado-text mb-2">
                {t("savedRecipes.deleteTitle")}
              </h3>
              <p className="text-sm text-bocado-gray mb-6">
                {t("savedRecipes.deleteMessage", {
                  title: mealToConfirmDelete.recipe.title,
                })}
              </p>
              {deleteError && (
                <p className="text-xs text-red-500 mb-4">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setMealToConfirmDelete(null)}
                  className="flex-1 bg-bocado-background text-bocado-dark-gray font-bold py-3 rounded-full text-sm hover:bg-bocado-border transition-colors active:scale-95"
                >
                  {t("savedRecipes.cancel")}
                </button>
                {/* ✅ FIX: spinner en vez de "..." durante el delete */}
                <button
                  onClick={confirmDelete}
                  disabled={toggleMutation.isPending}
                  className="flex-1 bg-red-500 text-white font-bold py-3 rounded-full text-sm hover:bg-red-600 active:scale-95 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {toggleMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    t("savedRecipes.delete")
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SavedRecipesScreen;
