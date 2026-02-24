// ⚠️ HELPERS para traducción segura de opciones
// Estos helpers aseguran que los valores guardados en Firebase siempre sean en español,
// pero la UI se muestre en el idioma seleccionado.

import {
  DISEASES,
  ALLERGIES,
  GOALS,
  ACTIVITY_LEVELS,
  ACTIVITY_FREQUENCIES,
  CRAVINGS,
  MEALS,
} from "../constants";

/**
 * Mapeo de valores en español a claves de traducción
 * IMPORTANTE: Mantener sincronizado con constants.ts y locales/*.json
 */

// Enfermedades
export const diseaseKeys: Record<string, string> = {
  Hipertensión: "options.diseases.hypertension",
  Diabetes: "options.diseases.diabetes",
  Hipotiroidismo: "options.diseases.hypothyroidism",
  Hipertiroidismo: "options.diseases.hyperthyroidism",
  Colesterol: "options.diseases.cholesterol",
  "Intestino irritable": "options.diseases.ibs",
};

// Alergias
export const allergyKeys: Record<string, string> = {
  "Intolerante a la lactosa": "options.allergies.lactose",
  "Alergia a frutos secos": "options.allergies.nuts",
  Celíaco: "options.allergies.celiac",
  Vegano: "options.allergies.vegan",
  Vegetariano: "options.allergies.vegetarian",
  Otro: "common.other",
};

// Objetivos nutricionales
export const goalKeys: Record<string, string> = {
  "Bajar de peso": "options.goals.loseWeight",
  "Subir de peso": "options.goals.gainWeight",
  "Generar músculo": "options.goals.buildMuscle",
  "Salud y bienestar": "options.goals.wellness",
};

// Niveles de actividad
export const activityKeys: Record<string, string> = {
  "🪑 Sedentario": "options.activity.sedentary",
  "🚶‍♂️ Activo ligero": "options.activity.light",
  "🏋️‍♀️ Fuerza": "options.activity.strength",
  "🏃‍♂️ Cardio": "options.activity.cardio",
  "⚽ Deportivo": "options.activity.sports",
  "🥇 Atleta": "options.activity.athlete",
  Otro: "common.other",
};

// Frecuencias de actividad
export const frequencyKeys: Record<string, string> = {
  Diario: "options.frequency.daily",
  "3-5 veces por semana": "options.frequency.frequent",
  "1-2 veces": "options.frequency.occasional",
  "Rara vez": "options.frequency.rarely",
};

// Antojos/tipos de comida
export const cravingKeys: Record<string, string> = {
  "🍕 Italiana / Pizza": "options.cravings.italian",
  "🍣 Japonesa / Sushi": "options.cravings.japanese",
  "🥗 Saludable o fit": "options.cravings.healthy",
  "🍜 Asiática / China": "options.cravings.asian",
  "🌮 Mexicana": "options.cravings.mexican",
  "🍔 Americana / Fast food": "options.cravings.american",
  "🥘 Mediterránea": "options.cravings.mediterranean",
  "🥡 Otros": "common.other",
};

// Comidas del día
export const mealKeys: Record<string, string> = {
  "🥞 Desayuno": "options.meals.breakfast",
  "🥗 Comida": "options.meals.lunch",
  "🥙 Cena": "options.meals.dinner",
  "🍎 Snack": "options.meals.snack",
};

/**
 * Función helper para traducir un valor desde español
 * @param valueInSpanish - Valor en español guardado en Firebase
 * @param mapping - Objeto de mapeo (diseaseKeys, allergyKeys, etc.)
 * @param t - Función de traducción del contexto i18n
 * @returns String traducido o el original si no se encuentra
 */
export function translateOption(
  valueInSpanish: string,
  mapping: Record<string, string>,
  t: (key: string) => string,
): string {
  const key = mapping[valueInSpanish];
  if (!key) {
    console.warn(`[i18n] No translation key found for: "${valueInSpanish}"`);
    return valueInSpanish; // Fallback al valor original
  }
  return t(key);
}

/**
 * Helper para traducir arrays de opciones
 */
export function translateOptions(
  valuesInSpanish: string[],
  mapping: Record<string, string>,
  t: (key: string) => string,
): string[] {
  return valuesInSpanish.map((value) => translateOption(value, mapping, t));
}

/**
 * Función para strip emoji de las opciones si es necesario
 */
export function stripEmoji(str: string): string {
  if (!str) return str;
  const emojiRegex =
    /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])\s*/;
  return str.replace(emojiRegex, "").trim();
}

/**
 * Ejemplo de uso en componentes:
 *
 * import { useTranslation } from '../contexts/I18nContext';
 * import { diseaseKeys, translateOption } from '../utils/translationHelpers';
 *
 * const MyComponent = () => {
 *   const { t } = useTranslation();
 *   const profile = useUserProfile(uid);
 *
 *   // profile.diseases contiene: ["Diabetes", "Hipertensión"]
 *
 *   return (
 *     <div>
 *       {profile.diseases.map(disease => (
 *         <span key={disease}>
 *           {translateOption(disease, diseaseKeys, t)}
 *         </span>
 *       ))}
 *     </div>
 *   );
 * };
 */
