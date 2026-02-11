import React from 'react';
import { SkeletonBase } from './SkeletonBase';

/**
 * Skeleton para un item de receta/restaurante en lista
 */
export const RecipeListItemSkeleton: React.FC = () => {
  return (
    <div className="border border-bocado-border rounded-2xl bg-white p-4">
      <div className="flex items-center gap-3">
        {/* Imagen placeholder */}
        <SkeletonBase 
          variant="rectangular" 
          width={64} 
          height={64} 
          className="rounded-xl shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Título */}
          <SkeletonBase 
            variant="text" 
            width="90%" 
            height={20} 
            className="rounded-lg"
          />
          {/* Subtítulo */}
          <SkeletonBase 
            variant="text" 
            width="60%" 
            height={16} 
            className="rounded"
          />
          {/* Badges */}
          <div className="flex gap-2 pt-1">
            <SkeletonBase 
              variant="rectangular" 
              width={50} 
              height={20} 
              className="rounded-lg"
            />
            <SkeletonBase 
              variant="rectangular" 
              width={60} 
              height={20} 
              className="rounded-lg"
            />
          </div>
        </div>

        {/* Botón de acción */}
        <SkeletonBase 
          variant="circular" 
          width={36} 
          height={36} 
          className="shrink-0"
        />
      </div>
    </div>
  );
};

/**
 * Skeleton para RecipeListScreen o SavedRestaurantsScreen
 * @param count - Número de items a mostrar (default: 4)
 */
export const RecipeListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center mb-6 px-4 pt-2 space-y-2">
        <SkeletonBase 
          variant="circular" 
          width={32} 
          height={32} 
          className="mx-auto"
        />
        <SkeletonBase 
          variant="text" 
          width={140} 
          height={24} 
          className="rounded-lg mx-auto"
        />
        <SkeletonBase 
          variant="text" 
          width={180} 
          height={14} 
          className="rounded mx-auto"
        />
      </div>

      {/* Lista de items */}
      <div className="flex-1 px-4 space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <RecipeListItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};

export default RecipeListSkeleton;
