import { useEffect } from "react";
import { setAnalyticsProperties } from "../firebaseConfig";
import { useUserProfile } from "./useUser";
import { useAuthStore } from "../stores/authStore";

/**
 * ✅ AUDITORÍA: Hook para sincronizar propiedades del perfil con Analytics
 *
 * V2: Ahora usa useUserProfile (TanStack Query) en lugar de useUserProfileStore (Zustand)
 * Esto elimina la duplicación de estado entre stores y hooks.
 *
 * Las propiedades sincronizadas son:
 * - nutritional_goal: Metas nutricionales del usuario
 * - allergies: Alergias seleccionadas
 * - country: País del usuario
 * - activity_level: Nivel de actividad física
 * - eating_habit: Hábito alimenticio
 * - cooking_affinity: Afinidad por cocinar
 */
export const useAnalyticsProperties = () => {
  // V2: Usar TanStack Query como fuente única de verdad
  const userId = useAuthStore(selectUserUid);
  const { data: profile } = useUserProfile(userId);

  useEffect(() => {
    if (!profile) return;

    // Construir objeto de propiedades para Analytics
    const properties: Record<string, string> = {};

    // Metas nutricionales (ej: "perder_peso,ganar_musculo")
    if (profile.nutritionalGoal && profile.nutritionalGoal.length > 0) {
      properties.nutritional_goal = profile.nutritionalGoal.join(",");
    }

    // Alergias (ej: "gluten,lacteos,frutos_secos")
    if (profile.allergies && profile.allergies.length > 0) {
      properties.allergies = profile.allergies.join(",");
    }

    // Otras alergias especificadas manualmente
    if (profile.otherAllergies) {
      properties.other_allergies = profile.otherAllergies;
    }

    // País del usuario
    if (profile.country) {
      properties.country = profile.country.toLowerCase();
    }

    // Ciudad del usuario
    if (profile.city) {
      properties.city = profile.city;
    }

    // Nivel de actividad física
    if (profile.activityLevel) {
      properties.activity_level = profile.activityLevel;
    }

    // Hábito alimenticio
    if (profile.eatingHabit) {
      properties.eating_habit = profile.eatingHabit;
    }

    // Afinidad por cocinar
    if (profile.cookingAffinity) {
      properties.cooking_affinity = profile.cookingAffinity;
    }

    // Enfermedades (ej: "diabetes,hipertension")
    if (profile.diseases && profile.diseases.length > 0) {
      properties.diseases = profile.diseases.join(",");
    }

    // Género
    if (profile.gender) {
      properties.gender = profile.gender;
    }

    // Edad (como rango para privacidad)
    if (profile.age) {
      const age = parseInt(profile.age, 10);
      if (!isNaN(age)) {
        if (age < 18) properties.age_range = "under_18";
        else if (age < 25) properties.age_range = "18_24";
        else if (age < 35) properties.age_range = "25_34";
        else if (age < 45) properties.age_range = "35_44";
        else if (age < 55) properties.age_range = "45_54";
        else if (age < 65) properties.age_range = "55_64";
        else properties.age_range = "65_plus";
      }
    }

    // Sincronizar con Analytics solo si hay propiedades
    if (Object.keys(properties).length > 0) {
      setAnalyticsProperties(properties);
    }
  }, [profile]);
};

// Import necesario
import { selectUserUid } from "../stores/authStore";

export default useAnalyticsProperties;
