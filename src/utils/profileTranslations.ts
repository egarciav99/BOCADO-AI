// Shared translation utilities for profile-related data
// These functions translate Spanish profile values to localized strings

import { stripLeadingEmoji } from "./emojiUtils";

export const translateDisease = (
  disease: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Hipertensión: t("diseases.hypertension"),
    Diabetes: t("diseases.diabetes"),
    Hipotiroidismo: t("diseases.hypothyroidism"),
    Hipertiroidismo: t("diseases.hyperthyroidism"),
    Colesterol: t("diseases.cholesterol"),
    "Intestino irritable": t("diseases.ibs"),
  };
  return map[disease] ?? disease;
};

export const translateAllergy = (
  allergy: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    "Intolerante a la lactosa": t("allergies.lactoseIntolerant"),
    "Alergia a frutos secos": t("allergies.nutAllergy"),
    Celíaco: t("allergies.celiac"),
    Vegano: t("allergies.vegan"),
    Vegetariano: t("allergies.vegetarian"),
    Otro: t("allergies.other"),
  };
  return map[allergy] ?? allergy;
};

export const translateGoal = (
  goal: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    "Bajar de peso": t("goals.loseWeight"),
    "Subir de peso": t("goals.gainWeight"),
    "Generar músculo": t("goals.buildMuscle"),
    "Salud y bienestar": t("goals.healthWellness"),
  };
  return map[goal] ?? goal;
};

export const translateActivityLevel = (
  level: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    "🪑 Sedentario": `🪑 ${t("activityLevels.sedentary")}`,
    "🚶‍♂️ Activo ligero": `🚶‍♂️ ${t("activityLevels.lightlyActive")}`,
    "🏋️‍♀️ Fuerza": `🏋️‍♀️ ${t("activityLevels.strength")}`,
    "🏃‍♂️ Cardio": `🏃‍♂️ ${t("activityLevels.cardio")}`,
    "⚽ Deportivo": `⚽ ${t("activityLevels.athletic")}`,
    "🥇 Atleta": `🥇 ${t("activityLevels.athlete")}`,
    Otro: t("activityLevels.other"),
  };
  // For ProfileScreen compatibility: strip emoji if not found with emoji
  const withEmoji = map[level];
  if (withEmoji) return withEmoji;
  
  // Try without emoji (for cases where emoji might be stripped)
  const textOnly = stripLeadingEmoji(level);
  const simpleMap: Record<string, string> = {
    Sedentario: t("activityLevels.sedentary"),
    "Activo ligero": t("activityLevels.lightlyActive"),
    Fuerza: t("activityLevels.strength"),
    Cardio: t("activityLevels.cardio"),
    Deportivo: t("activityLevels.athletic"),
    Atleta: t("activityLevels.athlete"),
    Otro: t("activityLevels.other"),
  };
  return simpleMap[textOnly] ?? level;
};

export const translateActivityFrequency = (
  freq: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Diario: t("activityFrequencies.daily"),
    "3-5 veces por semana": t("activityFrequencies.frequent"),
    "1-2 veces": t("activityFrequencies.occasional"),
    "Rara vez": t("activityFrequencies.rarely"),
  };
  return map[freq] ?? freq;
};

export const translateCookingAffinity = (
  affinity: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Nunca: t("cookingAffinity.nunca"),
    "A veces": t("cookingAffinity.aveces"),
    Seguido: t("cookingAffinity.seguido"),
    Siempre: t("cookingAffinity.siempre"),
  };
  return map[affinity] ?? affinity;
};

// ─── translateGender ───────────────────────────────────────────
export const translateGender = (
  gender: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Hombre: t("gender.male"),
    Mujer: t("gender.female"),
    Otro: t("gender.other"),
  };
  return map[gender] ?? gender;
};

// ─── translateFood ─────────────────────────────────────────────
// Traduce alimentos del perfil (foods.*).
// Si la clave no existe en las traducciones, retorna el foodKey
// original (puede ser un ingrediente personalizado del usuario).
export const translateFood = (
  foodKey: string,
  t: (key: string) => string,
): string => {
  const translation = t(`foods.${foodKey}`);
  return translation.startsWith("foods.") ? foodKey : translation;
};

// ─── translateDifficulty ───────────────────────────────────────
// Traduce dificultad de recetas. Los valores vienen en español
// de Firebase (Fácil, Media, Difícil) y se muestran en el idioma
// activo del usuario.
export const translateDifficulty = (
  difficulty: string,
  t: (key: string) => string,
): string => {
  const map: Record<string, string> = {
    Fácil: t("difficulty.easy"),
    Media: t("difficulty.medium"),
    Difícil: t("difficulty.hard"),
  };
  return map[difficulty] ?? difficulty;
};

// ─── translateMeal ─────────────────────────────────────────────
// Traduce tipos de comida que pueden incluir emoji al inicio.
// Preserva el emoji original y traduce solo el texto.
export const translateMeal = (
  meal: string,
  t: (key: string) => string,
): string => {
  const MEAL_KEYS: Record<string, string> = {
    Desayuno: "meals.desayuno",
    Comida: "meals.comida",
    Cena: "meals.cena",
    Snack: "meals.snack",
  };
  // Buscar emoji al inicio (asumimos max 4 caracteres para emoji + espacio)
  let emoji = "";
  let text = meal;
  // Si empieza con algo que no es letra, asumimos que es emoji
  if (meal.length > 0 && !/^[a-zA-ZÀ-ÿ]/.test(meal)) {
    const spaceIndex = meal.indexOf(" ");
    if (spaceIndex > 0 && spaceIndex <= 4) {
      emoji = meal.substring(0, spaceIndex + 1);
      text = meal.substring(spaceIndex + 1);
    }
  }
  const key = MEAL_KEYS[text];
  return key ? `${emoji}${t(key)}`.trim() : meal;
};

// ─── translateCraving ──────────────────────────────────────────
// Traduce tipos de antojo/cocina que pueden incluir emoji.
export const translateCraving = (
  craving: string,
  t: (key: string) => string,
): string => {
  const CRAVING_KEYS: Record<string, string> = {
    "Italiana / Pizza": "cravings.italiana",
    "Japonesa / Sushi": "cravings.japonesa",
    "Saludable o fit": "cravings.saludable",
    "Asiática / China": "cravings.asiatica",
    Mexicana: "cravings.mexicana",
    "Americana / Fast food": "cravings.americana",
    Mediterránea: "cravings.mediterranea",
    Otros: "cravings.otros",
  };
  // Buscar emoji al inicio (similar a translateMeal)
  let emoji = "";
  let text = craving;
  if (craving.length > 0 && !/^[a-zA-ZÀ-ÿ]/.test(craving)) {
    const spaceIndex = craving.indexOf(" ");
    if (spaceIndex > 0 && spaceIndex <= 4) {
      emoji = craving.substring(0, spaceIndex + 1);
      text = craving.substring(spaceIndex + 1);
    }
  }
  const key = CRAVING_KEYS[text];
  return key ? `${emoji}${t(key)}`.trim() : craving;
};

// ─── translateBudget ───────────────────────────────────────────
// Traduce etiquetas de presupuesto preservando el rango de precio
// entre paréntesis (ej: "Económico (50-150 MXN)").
export const translateBudget = (
  label: string,
  value: "low" | "medium" | "high",
  t: (key: string) => string,
): string => {
  const rangeMatch = label.match(/\((.*)\)/);
  const range = rangeMatch ? ` (${rangeMatch[1]})` : "";
  return `${t(`budget.${value}`)}${range}`;
};
