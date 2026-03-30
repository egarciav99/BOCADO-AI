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
