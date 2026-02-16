// src/config/featureFlags.ts - Configuración y valores por defecto de Feature Flags

import type { FeatureFlags } from '../types/featureFlags';

/**
 * Valores por defecto para todos los feature flags.
 * 
 * Estos valores se usan cuando:
 * 1. No hay conexión a Firestore
 * 2. El documento no existe
 * 3. Un flag específico no está definido
 * 
 * PRINCIPIO: Los features nuevos deben ser false (opt-in) hasta que se prueben.
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // UI Features
  newRecommendationUI: false,
  pantryV2: false,
  darkMode: false,
  
  // Analytics & Tracking
  enableAnalytics: true,  // Habilitado por defecto para tracking básico
  
  // Features experimentales
  aiSuggestions: false,
  shareMealPlans: false,
  smartNotifications: false,
  wearableIntegration: false,
};

/**
 * Configuración de refetch para los feature flags.
 */
export const FEATURE_FLAGS_CONFIG = {
  /** Tiempo de stale (ms) - datos considerados frescos */
  staleTime: 1000 * 60 * 5, // 5 minutos
  
  /** Tiempo de garbage collection (ms) */
  gcTime: 1000 * 60 * 30, // 30 minutos
  
  /** Intervalo de refetch automático (ms) */
  refetchInterval: 1000 * 60 * 5, // 5 minutos
  
  /** Número de reintentos en caso de error */
  retryCount: 3,
  
  /** Delay entre reintentos (ms) */
  retryDelay: 1000,
} as const;

// Admin allowlist (UIDs) for internal panels
export const ADMIN_UIDS = ['2kHglJK7HuZ4YxsZCgJps3hnNLF2'];

/**
 * Colecciones y documentos de Firestore para feature flags.
 */
export const FIRESTORE_FEATURE_FLAGS = {
  /** Colección principal */
  collection: 'feature_flags',
  /** Documento para flags globales */
  globalDoc: 'global',
  /** Subcolección para flags por usuario */
  usersSubcollection: 'users',
} as const;

/**
 * Query key para TanStack Query.
 */
export const FEATURE_FLAGS_QUERY_KEY = 'featureFlags';
