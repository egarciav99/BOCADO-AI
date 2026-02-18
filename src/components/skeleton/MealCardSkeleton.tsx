import React from "react";
import { SkeletonBase } from "./SkeletonBase";

/**
 * Skeleton para MealCard
 * Muestra la estructura de una tarjeta de comida mientras carga
 */
export const MealCardSkeleton: React.FC = () => {
  return (
    <div className="border border-bocado-border rounded-2xl bg-white p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          {/* Emoji placeholder */}
          <SkeletonBase
            variant="circular"
            width={32}
            height={32}
            className="shrink-0"
          />

          <div className="min-w-0 flex-1 space-y-2">
            {/* Título */}
            <SkeletonBase
              variant="text"
              width="85%"
              height={24}
              className="rounded-lg"
            />

            {/* Badges de info (tiempo, calorías, dificultad) */}
            <div className="flex flex-wrap gap-2">
              <SkeletonBase
                variant="rectangular"
                width={60}
                height={24}
                className="rounded-lg"
              />
              <SkeletonBase
                variant="rectangular"
                width={70}
                height={24}
                className="rounded-lg"
              />
              <SkeletonBase
                variant="rectangular"
                width={50}
                height={24}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <SkeletonBase variant="circular" width={40} height={40} />
          <SkeletonBase variant="circular" width={20} height={20} />
        </div>
      </div>
    </div>
  );
};

/**
 * Lista de MealCardSkeletons
 * @param count - Número de skeletons a mostrar (default: 3)
 */
export const MealCardSkeletonList: React.FC<{ count?: number }> = ({
  count = 3,
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <MealCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default MealCardSkeleton;
