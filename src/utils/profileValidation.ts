/**
 * Profile Validation Utils
 * Determina si un perfil de usuario está completo y válido
 */

import { UserProfile } from "../types";
import { logger } from "./logger";

/**
 * Campos obligatorios que definen un perfil COMPLETO
 * Un usuario con un perfil incompleto debe ir a CompleteProfileScreen
 */
const REQUIRED_PROFILE_FIELDS = [
  "gender",        // Hombre, Mujer, Otro
  "age",           // Número entre 10-120
  "weight",        // Número
  "height",        // Número
  "country",       // País
  "city",          // Ciudad
  "activityLevel", // Sedentario, Ligero, Moderado, Activo, Muy activo
  "eatingHabit",   // Dieta seleccionada
];

/**
 * Validar que un perfil tenga TODOS los campos obligatorios
 * 
 * @param profile - Perfil del usuario desde Firestore
 * @returns true si el perfil está completo y listo usar
 */
export const isProfileComplete = (profile: UserProfile | null | undefined): boolean => {
  if (!profile) {
    logger.warn("[profileValidation] No profile provided");
    return false;
  }

  // Verificar que TODOS los campos obligatorios existan y tengan valor
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = (profile as any)[field];

    // Es undefined, null, o string vacío
    if (value === undefined || value === null || value === "") {
      logger.warn(`[profileValidation] Missing required field: ${field}`);
      return false;
    }

    // Es un string pero está vacío
    if (typeof value === "string" && value.trim() === "") {
      logger.warn(`[profileValidation] Empty required field: ${field}`);
      return false;
    }

    // Es un número pero es NaN
    if (typeof value === "number" && isNaN(value)) {
      logger.warn(`[profileValidation] Invalid number field: ${field}`);
      return false;
    }

    // Campo especial: "Sin especificar" es considerado incompleto
    if (value === "Sin especificar" || value === "N/A") {
      logger.warn(`[profileValidation] Field not specified: ${field}`);
      return false;
    }
  }

  logger.info("[profileValidation] Profile is complete", {
    uid: profile.uid,
    country: profile.country,
    city: profile.city,
  });

  return true;
};

/**
 * Obtén una lista de campos faltantes en un perfil
 * Útil para debugging y mensajes de error
 * 
 * @param profile - Perfil incompleto
 * @returns Array de nombres de campos que faltan
 */
export const getMissingProfileFields = (profile: UserProfile | null | undefined): string[] => {
  if (!profile) return REQUIRED_PROFILE_FIELDS;

  return REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = (profile as any)[field];
    return !value || value === "" || value === "Sin especificar";
  });
};

/**
 * Obtén el porcentaje de completitud del perfil
 * Útil para mostrar una barra de progreso
 * 
 * @param profile - Perfil a evaluar
 * @returns Número entre 0-100
 */
export const getProfileCompleteness = (profile: UserProfile | null | undefined): number => {
  if (!profile) return 0;

  const completed = REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = (profile as any)[field];
    return value && value !== "" && value !== "Sin especificar";
  }).length;

  return Math.round((completed / REQUIRED_PROFILE_FIELDS.length) * 100);
};

/**
 * Determina si un usuario TIENE un perfil (aunque sea incompleto)
 * vs un usuario NUEVO sin perfil
 * 
 * @param profile - Perfil a evaluar
 * @returns true si existe un perfil (completo o no)
 */
export const hasUserProfile = (profile: UserProfile | null | undefined): boolean => {
  return !!profile && !!profile.uid;
};

/**
 * Obtén un resumen legible del estado del perfil para debugging
 * 
 * @param profile - Perfil a evaluar
 * @returns Objeto con información del estado
 */
export const getProfileStatus = (profile: UserProfile | null | undefined) => {
  if (!profile) {
    return {
      status: "NO_PROFILE" as const,
      message: "Usuario sin perfil",
      isComplete: false,
      completeness: 0,
      missingFields: REQUIRED_PROFILE_FIELDS,
    };
  }

  const isComplete = isProfileComplete(profile);
  const completeness = getProfileCompleteness(profile);
  const missingFields = getMissingProfileFields(profile);

  return {
    status: isComplete ? "COMPLETE" as const : "INCOMPLETE" as const,
    message: isComplete
      ? "Perfil listo para usar"
      : `Perfil incompleto (${completeness}% completado)`,
    isComplete,
    completeness,
    missingFields,
  };
};
