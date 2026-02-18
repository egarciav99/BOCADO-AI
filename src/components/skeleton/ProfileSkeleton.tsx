import React from "react";
import { SkeletonBase } from "./SkeletonBase";

/**
 * Skeleton para ProfileScreen
 * Muestra la estructura del perfil mientras carga
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-4 pt-2">
        <div className="flex items-center gap-2">
          <SkeletonBase variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <SkeletonBase
              variant="text"
              width={100}
              height={20}
              className="rounded-lg"
            />
            <SkeletonBase
              variant="text"
              width={140}
              height={14}
              className="rounded"
            />
          </div>
        </div>
        <SkeletonBase
          variant="rectangular"
          width={60}
          height={28}
          className="rounded-full"
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 space-y-6">
        {/* Información Personal */}
        <div className="space-y-3">
          <SkeletonBase
            variant="text"
            width={120}
            height={12}
            className="rounded"
          />
          <div className="flex flex-wrap gap-2">
            <SkeletonBase
              variant="rectangular"
              width={70}
              height={28}
              className="rounded-full"
            />
            <SkeletonBase
              variant="rectangular"
              width={80}
              height={28}
              className="rounded-full"
            />
            <SkeletonBase
              variant="rectangular"
              width={120}
              height={28}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Datos Corporales */}
        <div className="space-y-3">
          <SkeletonBase
            variant="text"
            width={100}
            height={12}
            className="rounded"
          />
          <div className="flex flex-wrap gap-2">
            <SkeletonBase
              variant="rectangular"
              width={90}
              height={28}
              className="rounded-full"
            />
            <SkeletonBase
              variant="rectangular"
              width={70}
              height={28}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Objetivo Nutricional */}
        <div className="space-y-3">
          <SkeletonBase
            variant="text"
            width={130}
            height={12}
            className="rounded"
          />
          <div className="flex flex-wrap gap-2">
            <SkeletonBase
              variant="rectangular"
              width={80}
              height={28}
              className="rounded-full"
            />
            <SkeletonBase
              variant="rectangular"
              width={100}
              height={28}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Actividad Física */}
        <div className="space-y-3">
          <SkeletonBase
            variant="text"
            width={100}
            height={12}
            className="rounded"
          />
          <SkeletonBase
            variant="rectangular"
            width={150}
            height={28}
            className="rounded-full"
          />
        </div>

        {/* Salud */}
        <div className="space-y-3">
          <SkeletonBase
            variant="text"
            width={50}
            height={12}
            className="rounded"
          />
          <div className="flex flex-wrap gap-2">
            <SkeletonBase
              variant="rectangular"
              width={100}
              height={28}
              className="rounded-full"
            />
          </div>
        </div>

        {/* Alergias */}
        <div className="space-y-3">
          <SkeletonBase
            variant="text"
            width={60}
            height={12}
            className="rounded"
          />
          <SkeletonBase
            variant="text"
            width={80}
            height={16}
            className="rounded"
          />
        </div>

        {/* Sección de Seguridad */}
        <div className="pt-6 border-t border-gray-200 space-y-3">
          <SkeletonBase
            variant="text"
            width={80}
            height={12}
            className="rounded"
          />
          <div className="space-y-2">
            <SkeletonBase
              variant="rectangular"
              width="100%"
              height={44}
              className="rounded-xl"
            />
            <SkeletonBase
              variant="rectangular"
              width="100%"
              height={44}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Sección de Preferencias */}
        <div className="pt-6 border-t border-gray-200 space-y-3">
          <SkeletonBase
            variant="text"
            width={90}
            height={12}
            className="rounded"
          />
          <SkeletonBase
            variant="rectangular"
            width="100%"
            height={44}
            className="rounded-xl"
          />
        </div>

        {/* Sección de Privacidad */}
        <div className="pt-6 border-t border-gray-200 space-y-3">
          <SkeletonBase
            variant="text"
            width={120}
            height={12}
            className="rounded"
          />
          <div className="space-y-2">
            <SkeletonBase
              variant="rectangular"
              width="100%"
              height={44}
              className="rounded-xl"
            />
            <SkeletonBase
              variant="rectangular"
              width="100%"
              height={44}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Botón de Logout */}
        <div className="pt-6 border-t border-gray-200">
          <SkeletonBase
            variant="rectangular"
            width="100%"
            height={44}
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
