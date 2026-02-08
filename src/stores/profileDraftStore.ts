// stores/profileDraftStore.ts - V2: Solo UI state, NO datos del perfil
//
// PRINCIPIO: Este store solo maneja estado TRANSITORIO de la UI.
// Los datos del formulario vienen de defaultValues (perfil real).
// NO es una copia del perfil, es solo estado de edición temporal.
//
// CAMBIOS V2:
// - Eliminado: Campos duplicados del perfil
// - Agregado: Solo estado de navegación/formulario
// - Los datos iniciales vienen de useUserProfile + defaultValues

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// ESTADO DE UI PARA FORMULARIOS MULTI-PASO
// ============================================

interface ProfileDraftState {
  // Metadatos del formulario (UI state)
  currentStep: number;
  isHydrated: boolean;
  isDirty: boolean;
  lastSavedAt: number | null;
  
  // Datos temporales del formulario (solo mientras edita)
  // NOTA: Estos NO reemplazan el perfil, son solo borrador temporal
  formData: Record<string, any>;
  
  // Actions
  setCurrentStep: (step: number) => void;
  updateFormField: (field: string, value: any) => void;
  updateFormData: (data: Partial<Record<string, any>>) => void;
  markDirty: (dirty: boolean) => void;
  saveDraft: () => void;
  clearDraft: () => void;
  resetForm: () => void;
}

const INITIAL_STATE = {
  currentStep: 1,
  isHydrated: false,
  isDirty: false,
  lastSavedAt: null,
  formData: {},
};

export const useProfileDraftStore = create<ProfileDraftState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      updateFormField: (field, value) => set((state) => ({
        formData: { ...state.formData, [field]: value },
        isDirty: true,
      })),
      
      updateFormData: (data) => set((state) => ({
        formData: { ...state.formData, ...data },
        isDirty: true,
      })),
      
      markDirty: (dirty) => set({ isDirty: dirty }),
      
      saveDraft: () => set({ 
        lastSavedAt: Date.now(),
        isDirty: true,
      }),
      
      clearDraft: () => set({
        ...INITIAL_STATE,
        isHydrated: true,
      }),
      
      resetForm: () => set({
        formData: {},
        isDirty: false,
        currentStep: 1,
        lastSavedAt: null,
      }),
    }),
    {
      name: 'bocado-form-draft-v2',
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
      // Solo persistir el borrador temporal, no datos del perfil
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
);

// ============================================
// HOOK DE INTEGRACIÓN: Draft + Perfil Real
// ============================================

import { useEffect, useMemo } from 'react';
import { useUserProfile } from '../hooks/useUser';

interface UseProfileDraftWithDataOptions {
  userId: string | undefined;
  resetOnMount?: boolean;
}

/**
 * Hook que combina el borrador del formulario con los datos reales del perfil.
 * 
 * Los datos del perfil (useUserProfile) son la fuente de verdad.
 * El borrador (profileDraftStore) solo almacena cambios temporales.
 * 
 * Ejemplo:
 * ```tsx
 * const { formData, updateField, isDirty, resetForm } = useProfileDraftWithData({ userId });
 * ```
 */
export const useProfileDraftWithData = (options: UseProfileDraftWithDataOptions) => {
  const { userId, resetOnMount = true } = options;
  
  const { data: profile, isLoading: isProfileLoading } = useUserProfile(userId);
  const draft = useProfileDraftStore();
  
  // Resetear borrador al montar (opcional)
  useEffect(() => {
    if (resetOnMount && userId) {
      draft.resetForm();
    }
  }, [userId, resetOnMount]);
  
  // Merge: Perfil real + cambios del borrador
  const mergedData = useMemo(() => {
    if (!profile) return draft.formData;
    
    // El borrador tiene prioridad sobre el perfil (cambios sin guardar)
    return {
      ...profile,
      ...draft.formData,
    };
  }, [profile, draft.formData]);
  
  return {
    // Datos combinados (para el formulario)
    formData: mergedData,
    
    // Estado del perfil original
    profile,
    isProfileLoading,
    
    // Estado del borrador
    currentStep: draft.currentStep,
    isDirty: draft.isDirty,
    lastSavedAt: draft.lastSavedAt,
    
    // Actions
    setCurrentStep: draft.setCurrentStep,
    updateField: draft.updateFormField,
    updateData: draft.updateFormData,
    markDirty: draft.markDirty,
    saveDraft: draft.saveDraft,
    clearDraft: draft.clearDraft,
    resetForm: draft.resetForm,
    
    // Helper: ¿Hay cambios sin guardar?
    hasUnsavedChanges: draft.isDirty && Object.keys(draft.formData).length > 0,
  };
};

// ============================================
// HOOK PARA FORMULARIOS DE EDICIÓN
// ============================================

import { useCallback } from 'react';

interface UseEditableProfileOptions {
  userId: string | undefined;
  onSave?: () => void;
}

/**
 * Hook completo para editar el perfil con persistencia temporal.
 * 
 * Combina:
 * - Carga del perfil actual (TanStack Query)
 * - Borrador temporal (Zustand)
 * - Guardado en Firestore (Mutation)
 * 
 * Ejemplo:
 * ```tsx
 * const {
 *   formData,
 *   updateField,
 *   saveChanges,
 *   isSaving,
 *   hasUnsavedChanges
 * } = useEditableProfile({ userId });
 * ```
 */
export const useEditableProfile = (options: UseEditableProfileOptions) => {
  const { userId, onSave } = options;
  
  const draft = useProfileDraftWithData({ userId, resetOnMount: true });
  const updateMutation = useUpdateUserProfile();
  
  const saveChanges = useCallback(async () => {
    if (!userId || !draft.hasUnsavedChanges) return;
    
    // Filtrar solo los campos que cambiaron
    const changedFields = Object.entries(draft.formData).reduce(
      (acc, [key, value]) => {
        if (draft.profile && (draft.profile as any)[key] !== value) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );
    
    if (Object.keys(changedFields).length === 0) {
      draft.clearDraft();
      return;
    }
    
    await updateMutation.mutateAsync({
      userId,
      data: changedFields,
    });
    
    draft.clearDraft();
    onSave?.();
  }, [userId, draft, updateMutation, onSave]);
  
  const discardChanges = useCallback(() => {
    draft.resetForm();
  }, [draft]);
  
  return {
    // Datos
    formData: draft.formData,
    profile: draft.profile,
    isLoading: draft.isProfileLoading,
    
    // Estado
    isSaving: updateMutation.isPending,
    hasUnsavedChanges: draft.hasUnsavedChanges,
    isError: updateMutation.isError,
    error: updateMutation.error,
    
    // Actions
    updateField: draft.updateField,
    updateData: draft.updateData,
    saveChanges,
    discardChanges,
  };
};

// Import necesario
import { useUpdateUserProfile } from '../hooks/useUser';
