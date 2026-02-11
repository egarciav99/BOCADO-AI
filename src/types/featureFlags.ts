// src/types/featureFlags.ts - Tipos para el sistema de Feature Flags

/**
 * Definición de todos los feature flags disponibles en la aplicación.
 * 
 * Nota: Al agregar un nuevo flag, añadirlo también en:
 * - DEFAULT_FEATURE_FLAGS (src/config/featureFlags.ts)
 * - Documentación (docs/FEATURE_FLAGS.md)
 */
export interface FeatureFlags {
  // UI Features
  /** Nuevo diseño de la pantalla de recomendaciones */
  newRecommendationUI: boolean;
  /** Versión 2 de la despensa con funcionalidades mejoradas */
  pantryV2: boolean;
  /** Modo oscuro disponible */
  darkMode: boolean;
  
  // Analytics & Tracking
  /** Habilitar tracking de analytics */
  enableAnalytics: boolean;
  
  // Features experimentales (ejemplos para futuras implementaciones)
  /** Habilitar sugerencias basadas en IA avanzada */
  aiSuggestions: boolean;
  /** Permitir compartir planes de comidas */
  shareMealPlans: boolean;
  /** Notificaciones push inteligentes */
  smartNotifications: boolean;
  /** Integración con wearables */
  wearableIntegration: boolean;
}

/**
 * Tipo para los flags globales (pueden ser parciales)
 */
export type GlobalFeatureFlags = Partial<FeatureFlags>;

/**
 * Tipo para los flags por usuario (pueden ser parciales, overrides)
 */
export type UserFeatureFlags = Partial<FeatureFlags>;

/**
 * Estado de carga de los feature flags
 */
export interface FeatureFlagsState {
  flags: FeatureFlags;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

/**
 * Documento de Firestore para flags globales
 */
export interface GlobalFeatureFlagsDocument {
  flags: GlobalFeatureFlags;
  updatedAt: import('firebase/firestore').Timestamp;
  updatedBy?: string;
}

/**
 * Documento de Firestore para flags de usuario
 */
export interface UserFeatureFlagsDocument {
  flags: UserFeatureFlags;
  updatedAt: import('firebase/firestore').Timestamp;
}
