/**
 * 🔄 Middleware de Traducción Entrada/Salida
 * 
 * Responsable de:
 * 1. MIDDLEWARE DE LECTURA (Outbound): Traducir datos de Firebase Español → UI Inglés
 * 2. MIDDLEWARE DE DISPLAY: Preparar datos de perfil para mostrar en UI
 * 
 * REGLA: Firebase SIEMPRE almacena en español, pero la UI puede mostrar en inglés
 */

import { translateOption, diseaseKeys, allergyKeys, goalKeys, activityKeys, frequencyKeys } from './translationHelpers';

/**
 * ✅ MIDDLEWARE DE LECTURA (Outbound)
 * 
 * Convierte datos de Firebase (español) a la UI (en el idioma del usuario)
 * 
 * Ejemplo:
 * ```typescript
 * const { t } = useTranslation();
 * const diseases = ['Hipertensión', 'Diabetes'];
 * const displayDiseases = translateForUI(diseases, diseaseKeys, t);
 * // Si UI está en inglés: ['Hypertension', 'Diabetes']
 * // Si UI está en español: ['Hipertensión', 'Diabetes']
 * ```
 */
export function translateForUI(
  values: string[],
  mapping: Record<string, string>,
  t: (key: string) => string
): string[] {
  return values.map(value => translateOption(value, mapping, t));
}

/**
 * Preparar datos de perfil para mostrar en UI
 * Traduce opciones pero mantiene valores puros
 */
export function prepareProfileForDisplay(
  profile: any,
  t: (key: string) => string
) {
  return {
    ...profile,
    diseases: translateForUI(profile.diseases || [], diseaseKeys, t),
    allergies: translateForUI(profile.allergies || [], allergyKeys, t),
    nutritionalGoal: translateForUI(profile.nutritionalGoal || [], goalKeys, t),
    activityLevel: profile.activityLevel ? translateOption(profile.activityLevel, activityKeys, t) : '',
    activityFrequency: profile.activityFrequency ? translateOption(profile.activityFrequency, frequencyKeys, t) : '',
  };
}
