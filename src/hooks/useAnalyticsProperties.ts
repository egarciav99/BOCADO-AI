import { useEffect } from "react";
// ✅ FIX: import al principio del archivo
import { selectUserUid } from "../stores/authStore";
import { setAnalyticsProperties } from "../firebaseConfig";
import { useUserProfile } from "./useUser";
import { useAuthStore } from "../stores/authStore";

/**
 * Hook para sincronizar propiedades del perfil con Analytics.
 * Usa TanStack Query como fuente única de verdad.
 *
 * Propiedades sincronizadas: nutritional_goal, allergies, country,
 * activity_level, eating_habit, cooking_affinity, age_range, gender, etc.
 */
export const useAnalyticsProperties = () => {
  const userId = useAuthStore(selectUserUid);
  const { data: profile } = useUserProfile(userId);

  useEffect(() => {
    if (!profile) return;

    const properties: Record<string, string> = {};

    if (profile.nutritionalGoal?.length > 0) {
      properties.nutritional_goal = profile.nutritionalGoal.join(",");
    }
    if (profile.allergies?.length > 0) {
      properties.allergies = profile.allergies.join(",");
    }
    if (profile.otherAllergies) {
      properties.other_allergies = profile.otherAllergies;
    }
    if (profile.country) {
      properties.country = profile.country.toLowerCase();
    }
    if (profile.city) {
      properties.city = profile.city;
    }
    if (profile.activityLevel) {
      properties.activity_level = profile.activityLevel;
    }
    if (profile.eatingHabit) {
      properties.eating_habit = profile.eatingHabit;
    }
    if (profile.cookingAffinity) {
      properties.cooking_affinity = profile.cookingAffinity;
    }
    if (profile.diseases?.length > 0) {
      properties.diseases = profile.diseases.join(",");
    }
    if (profile.gender) {
      properties.gender = profile.gender;
    }
    if (profile.age) {
      const age = parseInt(profile.age, 10);
      if (!isNaN(age)) {
        if (age < 18)      properties.age_range = "under_18";
        else if (age < 25) properties.age_range = "18_24";
        else if (age < 35) properties.age_range = "25_34";
        else if (age < 45) properties.age_range = "35_44";
        else if (age < 55) properties.age_range = "45_54";
        else if (age < 65) properties.age_range = "55_64";
        else               properties.age_range = "65_plus";
      }
    }

    if (Object.keys(properties).length > 0) {
      setAnalyticsProperties(properties);
    }
  // ✅ FIX: userId en deps — re-sincroniza si cambia el usuario
  }, [profile, userId]);
};

export default useAnalyticsProperties;