// src/services/featureFlags.ts - Servicio de Feature Flags

import { doc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type {
  FeatureFlags,
  GlobalFeatureFlags,
  UserFeatureFlags,
  GlobalFeatureFlagsDocument,
  UserFeatureFlagsDocument,
} from "../types/featureFlags";
import {
  DEFAULT_FEATURE_FLAGS,
  FIRESTORE_FEATURE_FLAGS,
} from "../config/featureFlags";
import { logger } from "../utils/logger";

/**
 * Obtiene los feature flags globales desde Firestore.
 * Aplica valores por defecto para cualquier flag no definido.
 */
export async function getGlobalFeatureFlags(): Promise<GlobalFeatureFlags> {
  try {
    const docRef = doc(
      db,
      FIRESTORE_FEATURE_FLAGS.collection,
      FIRESTORE_FEATURE_FLAGS.globalDoc,
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      logger.info(
        "[FeatureFlags] No global flags document found, using defaults",
      );
      return {};
    }

    const data = docSnap.data() as GlobalFeatureFlagsDocument;
    logger.info("[FeatureFlags] Global flags loaded successfully");

    return data.flags || {};
  } catch (error) {
    logger.error("[FeatureFlags] Error loading global flags:", error);
    // En caso de error, devolver objeto vacío para que se usen los defaults
    return {};
  }
}

/**
 * Obtiene los feature flags específicos de un usuario desde Firestore.
 * Estos tienen prioridad sobre los globales.
 */
export async function getUserFeatureFlags(
  userId: string,
): Promise<UserFeatureFlags> {
  if (!userId) {
    logger.warn("[FeatureFlags] No userId provided for user flags");
    return {};
  }

  try {
    const docRef = doc(
      db,
      FIRESTORE_FEATURE_FLAGS.collection,
      FIRESTORE_FEATURE_FLAGS.globalDoc,
      FIRESTORE_FEATURE_FLAGS.usersSubcollection,
      userId,
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      logger.info(`[FeatureFlags] No user flags found for user ${userId}`);
      return {};
    }

    const data = docSnap.data() as UserFeatureFlagsDocument;
    logger.info(`[FeatureFlags] User flags loaded for user ${userId}`);

    return data.flags || {};
  } catch (error) {
    logger.error("[FeatureFlags] Error loading user flags:", error);
    return {};
  }
}

/**
 * Obtiene todos los feature flags combinados para un usuario.
 * La precedencia es: User > Global > Default
 */
export async function getAllFeatureFlags(
  userId?: string | null,
): Promise<FeatureFlags> {
  const [globalFlags, userFlags] = await Promise.all([
    getGlobalFeatureFlags(),
    userId ? getUserFeatureFlags(userId) : Promise.resolve({}),
  ]);

  // Mergear en orden de precedencia: Defaults -> Global -> User
  const mergedFlags: FeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...globalFlags,
    ...userFlags,
  };

  logger.info("[FeatureFlags] All flags merged successfully", {
    userId: userId || "anonymous",
    flagCount: Object.keys(mergedFlags).length,
  });

  return mergedFlags;
}

/**
 * Evalúa si un feature específico está habilitado.
 *
 * Orden de precedencia:
 * 1. Flags de usuario (mayor prioridad)
 * 2. Flags globales
 * 3. Valores por defecto (menor prioridad)
 */
export function isFeatureEnabled(
  feature: keyof FeatureFlags,
  userFlags: UserFeatureFlags,
  globalFlags: GlobalFeatureFlags,
): boolean {
  // 1. Verificar en flags de usuario
  if (feature in userFlags && userFlags[feature] !== undefined) {
    return Boolean(userFlags[feature]);
  }

  // 2. Verificar en flags globales
  if (feature in globalFlags && globalFlags[feature] !== undefined) {
    return Boolean(globalFlags[feature]);
  }

  // 3. Usar valor por defecto
  return DEFAULT_FEATURE_FLAGS[feature];
}

/**
 * Evalúa múltiples features y devuelve un objeto con los resultados.
 * Útil para componentes que necesitan chequear varios flags a la vez.
 */
export function areFeaturesEnabled(
  features: Array<keyof FeatureFlags>,
  userFlags: UserFeatureFlags,
  globalFlags: GlobalFeatureFlags,
): Record<keyof FeatureFlags, boolean> {
  const results = {} as Record<keyof FeatureFlags, boolean>;

  for (const feature of features) {
    results[feature] = isFeatureEnabled(feature, userFlags, globalFlags);
  }

  return results;
}

/**
 * Compara dos sets de flags para detectar cambios.
 * Útil para determinar si se necesita re-renderizar.
 */
export function haveFlagsChanged(
  oldFlags: FeatureFlags,
  newFlags: FeatureFlags,
): boolean {
  const keys = Object.keys(DEFAULT_FEATURE_FLAGS) as Array<keyof FeatureFlags>;

  return keys.some((key) => oldFlags[key] !== newFlags[key]);
}

/**
 * Obtiene los flags efectivos para un usuario específico.
 * Versión optimizada que ya combina todo en una sola llamada.
 */
export async function getEffectiveFeatureFlags(
  userId?: string | null,
): Promise<{
  flags: FeatureFlags;
  globalFlags: GlobalFeatureFlags;
  userFlags: UserFeatureFlags;
}> {
  const [globalFlags, userFlags] = await Promise.all([
    getGlobalFeatureFlags(),
    userId
      ? getUserFeatureFlags(userId)
      : Promise.resolve({} as UserFeatureFlags),
  ]);

  const flags: FeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...globalFlags,
    ...userFlags,
  };

  return { flags, globalFlags, userFlags };
}
