import React from 'react';
import { SkeletonBase } from './SkeletonBase';

/**
 * Skeleton para PantryZoneSelector
 * Muestra la estructura de las zonas de la despensa
 */
export const PantryZoneSelectorSkeleton: React.FC = () => {
  return (
    <div className="flex-1 px-4 pt-4 pb-24">
      {/* Header */}
      <div className="text-center mb-6 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <SkeletonBase 
            variant="circular" 
            width={28} 
            height={28} 
          />
          <SkeletonBase 
            variant="text" 
            width={120} 
            height={24} 
            className="rounded-lg"
          />
        </div>
        <SkeletonBase 
          variant="text" 
          width={160} 
          height={16} 
          className="rounded mx-auto"
        />
      </div>

      {/* Zonas de la despensa */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="w-full p-5 rounded-2xl border border-gray-200 bg-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonBase 
                  variant="circular" 
                  width={40} 
                  height={40} 
                />
                <SkeletonBase 
                  variant="text" 
                  width={100} 
                  height={22} 
                  className="rounded-lg"
                />
              </div>
              <SkeletonBase 
                variant="text" 
                width={12} 
                height={20} 
                className="rounded"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton para un item de la despensa (grid)
 */
export const PantryItemSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl p-2 aspect-square flex flex-col items-center justify-center gap-1 border-2 border-gray-200 bg-gray-50">
      <SkeletonBase 
        variant="circular" 
        width={32} 
        height={32} 
      />
      <SkeletonBase 
        variant="text" 
        width="80%" 
        height={12} 
        className="rounded"
      />
      <SkeletonBase 
        variant="circular" 
        width={6} 
        height={6} 
      />
    </div>
  );
};

/**
 * Skeleton para PantryZoneDetail
 * Muestra la estructura del detalle de una zona
 */
export const PantryZoneDetailSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <SkeletonBase 
            variant="circular" 
            width={32} 
            height={32} 
          />
          <SkeletonBase 
            variant="text" 
            width={140} 
            height={22} 
            className="rounded-lg"
          />
          <SkeletonBase 
            variant="text" 
            width={60} 
            height={14} 
            className="rounded"
          />
        </div>

        {/* Tabs de categorías */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBase 
              key={index}
              variant="rectangular" 
              width={80} 
              height={28} 
              className="rounded-full shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {/* Input de búsqueda */}
        <SkeletonBase 
          variant="rectangular" 
          width="100%" 
          height={48} 
          className="rounded-xl mb-6"
        />

        {/* Grid de items */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <PantryItemSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton principal para PantryScreen
 * Detecta automáticamente si mostrar selector o detalle
 */
export const PantrySkeleton: React.FC<{ showDetail?: boolean }> = ({ 
  showDetail = false 
}) => {
  return showDetail ? <PantryZoneDetailSkeleton /> : <PantryZoneSelectorSkeleton />;
};

export default PantrySkeleton;
