import { createRegexPattern } from "../utils/shared-logic";
import type { FirestoreIngredient } from "./recommendation-scorer";

/**
 * User profile structure (flexible to accept different UserProfile types)
 */
interface UserProfileForFilter {
  uid?: string;
  allergies?: string[];
  dislikedFoods?: string[];
  eatingHabit?: string;
  diseases?: string[];
  otherAllergies?: string;
  [key: string]: any;
}

/**
 * Filter ingredients based on user preferences:
 * - Allergies (CRITICAL - medical)
 * - Dislikes (preference)
 * - Eating habits (vegan/vegetarian)
 * - Diseases (diabetes, hypertension, etc)
 * 
 * This function is shared between API endpoints and tests to ensure
 * consistent ingredient filtering logic.
 * 
 * @param allIngredients - All available ingredients
 * @param user - User profile with dietary restrictions
 * @returns Filtered ingredients safe for the user
 */
export function filterIngredientes(
  allIngredients: FirestoreIngredient[],
  user: UserProfileForFilter
): FirestoreIngredient[] {
  const allergies = (user.allergies || []).map((a) => a.toLowerCase());
  const dislikedFoods = (user.dislikedFoods || []).map((d) => d.toLowerCase());
  const eatingHabit = (user.eatingHabit || "").toLowerCase();
  const diseases = (user.diseases || []).map((d) => d.toLowerCase());
  const otherAllergies = (user.otherAllergies || "")
    .toLowerCase()
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  // Comprehensive allergen mapping
  const allergenMap: Record<string, string[]> = {
    "alergia a frutos secos": [
      "nuez",
      "almendra",
      "cacahuate",
      "pistacho",
      "avellana",
      "semilla",
      "pecan",
    ],
    celíaco: ["trigo", "cebada", "centeno", "gluten", "pan", "pasta", "galleta"],
    "alergia a mariscos": [
      "camarón",
      "langosta",
      "cangrejo",
      "mejillón",
      "ostra",
      "camarones",
      "pulpo",
    ],
    "alergia a cacahuates": ["cacahuate", "maní", "mantequilla de maní"],
    "intolerancia a la lactosa": [
      "leche",
      "queso",
      "yogur",
      "mantequilla",
      "crema",
      "nata",
      "helado",
    ],
    "alergia al huevo": ["huevo", "clara", "yema"],
  };

  return allIngredients.filter((ingredient) => {
    const name = ingredient.name.toLowerCase();
    const regional = ingredient.regional.es?.toLowerCase() || "";
    const mx = ingredient.regional.mx?.toLowerCase() || "";
    const combinedText = `${name} ${regional} ${mx}`;

    // 1️⃣ CRITICAL PRIORITY: Exclude disliked foods
    if (
      dislikedFoods.some((d) => {
        const pattern = createRegexPattern(d);
        return new RegExp(pattern, "i").test(combinedText);
      })
    ) {
      return false;
    }

    // 2️⃣ Exclude allergens
    for (const allergyKey of allergies) {
      const allergens = allergenMap[allergyKey] || [allergyKey];
      if (
        allergens.some((a) => new RegExp(`\\b${a}\\b`, "i").test(combinedText))
      ) {
        return false;
      }
    }

    // 2.1️⃣ Exclude manual allergies
    if (
      otherAllergies.some((oa) => {
        const pattern = createRegexPattern(oa);
        return new RegExp(pattern, "i").test(combinedText);
      })
    ) {
      return false;
    }

    // 3️⃣ Filter by eating habit
    if (eatingHabit.includes("vegano")) {
      const animalProducts = [
        "carne",
        "pollo",
        "pavo",
        "res",
        "cerdo",
        "cordero",
        "pescado",
        "camarón",
        "huevo",
        "leche",
        "queso",
        "miel",
      ];
      if (
        animalProducts.some((m) =>
          new RegExp(`\\b${m}\\b`, "i").test(combinedText)
        )
      ) {
        return false;
      }
    } else if (eatingHabit.includes("vegetariano")) {
      const meats = [
        "carne",
        "pollo",
        "pavo",
        "res",
        "cerdo",
        "cordero",
        "pescado",
        "camarón",
      ];
      if (meats.some((m) => new RegExp(`\\b${m}\\b`, "i").test(combinedText))) {
        return false;
      }
    }

    // 4️⃣ Filter by disease
    for (const disease of diseases) {
      // 🩺 DIABETES: Avoid high-sugar foods
      if (disease.includes("diabetes")) {
        const highSugar = [
          "azúcar",
          "dulce",
          "postre",
          "chocolate",
          "refresco",
          "jugo de",
          "miel",
          "caramelo",
        ];
        if (highSugar.some((s) => combinedText.includes(s))) {
          return false;
        }
      }

      // 🩺 HYPERTENSION: Avoid salty foods
      if (disease.includes("hipertensión")) {
        const saltyFoods = [
          "sal",
          "embutido",
          "jamón",
          "tocino",
          "salchicha",
          "conserva",
          "enlatado",
        ];
        if (saltyFoods.some((s) => combinedText.includes(s))) {
          return false;
        }
      }

      // 🩺 CHOLESTEROL: Avoid fatty foods
      if (disease.includes("colesterol")) {
        const fattyFoods = [
          "manteca",
          "mantequilla",
          "chicharrón",
          "grasa animal",
          "crema",
        ];
        if (fattyFoods.some((f) => combinedText.includes(f))) {
          return false;
        }
      }

      // 🩺 IRRITABLE BOWEL: Avoid irritants
      if (disease.includes("intestino irritable") || disease.includes("ibs")) {
        const irritants = ["picante", "chile", "ají", "curry", "café"];
        if (irritants.some((i) => combinedText.includes(i))) {
          return false;
        }
      }
    }

    return true;
  });
}
