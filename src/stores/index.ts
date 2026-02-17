// stores/index.ts - V2: Exportaciones centralizadas
// 
// PRINCIPIO: 
// - Zustand: Solo UI state local (tabs, modales, drafts temporales)
// - TanStack Query: Datos de servidor (perfil, recetas, despensa)
// - NO duplicar estado entre ambos

// ============================================
// AUTH: Estado de sesión mínimo
// ============================================
export { 
  useAuthStore,
  selectUserUid,
  selectIsAuthenticated,
  selectIsLoading,
} from './authStore';

// ============================================
// DRAFT: Estado transitorio de formularios
// ============================================
export { useProfileDraftStore } from './profileDraftStore';

// NOTA: useProfileDraftWithData y useEditableProfile se exportan
// desde hooks/useProfileDraft.ts para evitar dependencias circulares.
// Importar desde allí: import { useProfileDraftWithData } from '../hooks/useProfileDraft';

// ============================================
// PANTRY: Estado UI de la despensa
// ============================================
export { usePantryStore } from './pantryStore';

// ============================================
// NOTAS:
// ============================================
// - Eliminado: userProfileStore (usar useUserProfile de hooks/)
// - Los datos del perfil vienen de TanStack Query
// - Los stores solo mantienen estado de UI
