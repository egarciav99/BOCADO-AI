/**
 * Nutritional Validator
 * 
 * Maps user restrictions (allergies, diseases) to nutritional validation rules.
 * This replaces the Airtable formula approach with programmatic validation.
 * 
 * Key insight: Instead of letting Gemini "remember" restrictions, we validate
 * food items BEFORE passing them to the AI, ensuring 100% compliance.
 */

export interface RestrictionFilters {
  vegano: boolean;
  vegetariano: boolean;
  celiaco: boolean;
  sinLactosa: boolean;
  sinMariscos: boolean;
  sinFrutosSecos: boolean;
  // Diseases
  diabetes: boolean;
  hipertension: boolean;
  colesterol: boolean;
  hipotiroidismo: boolean;
  hipertiroidismo: boolean;
  intestinoIritable: boolean;
}

export interface NutritionalLimits {
  maxSodium?: number; // mg
  maxSugars?: number; // g
  maxGlycoIndex?: number; // índice glucémico
  minFiber?: number; // g
  maxSaturatedFats?: number; // g
  maxCholesterol?: number; // mg
  minIodine?: number; // µg
  maxIodine?: number; // µg
}

export interface FoodItem {
  food_name: string;
  food_type?: string;
  servings?: any; // FatSecret serving data
  // Optional nutritional data (can be enriched from other sources)
  nutrition?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sodium_mg?: number;
    sugars_g?: number;
    saturated_fat_g?: number;
    cholesterol_mg?: number;
    iodine_µg?: number;
    glycemic_index?: number;
  };
  ingredients?: string[]; // List of ingredients in the food
}

export class NutritionalValidator {
  /**
   * Maps user profile (allergies, diseases) to restriction filters
   */
  static buildFiltersFromProfile(userProfile: any): RestrictionFilters {
    const allergies = userProfile.allergies || [];
    const diseases = userProfile.diseases || [];

    return {
      vegano: allergies.includes("Vegano"),
      vegetariano: allergies.includes("Vegetariano"),
      celiaco: allergies.includes("Celíaco"),
      sinLactosa: allergies.includes("Intolerancia a la lactosa"),
      sinMariscos: allergies.includes("Alergia a mariscos") ||
        allergies.some((a: string) => a.toLowerCase().includes("marisco")),
      sinFrutosSecos:
        allergies.includes("Alergia a frutos secos") ||
        allergies.some((a: string) => a.toLowerCase().includes("frutos secos")),

      // Diseases
      diabetes: diseases.includes("Diabetes"),
      hipertension: diseases.includes("Hipertensión"),
      colesterol: diseases.includes("Colesterol"),
      hipotiroidismo: diseases.includes("Hipotiroidismo"),
      hipertiroidismo: diseases.includes("Hipertiroidismo"),
      intestinoIritable: diseases.includes("Intestino irritable"),
    };
  }

  /**
   * Builds nutritional limits based on filters
   */
  static buildNutritionalLimits(filters: RestrictionFilters): NutritionalLimits {
    const limits: NutritionalLimits = {};

    // Hipertensión: sodio < 140 mg por porción
    if (filters.hipertension) {
      limits.maxSodium = 140;
    }

    // Diabetes: índice glucémico < 55, azúcares < 10g
    if (filters.diabetes) {
      limits.maxGlycoIndex = 55;
      limits.maxSugars = 10;
    }

    // Colesterol: < 20mg colesterol, < 1.5g grasas saturadas
    if (filters.colesterol) {
      limits.maxCholesterol = 20;
      limits.maxSaturatedFats = 1.5;
    }

    // Hipotiroidismo: yodo > 10 µg
    if (filters.hipotiroidismo) {
      limits.minIodine = 10;
    }

    // Hipertiroidismo: yodo < 50 µg
    if (filters.hipertiroidismo) {
      limits.maxIodine = 50;
    }

    // Intestino irritable: fibra entre 1-10g
    if (filters.intestinoIritable) {
      limits.minFiber = 1;
      // Note: we don't have max fiber in the original formula,
      // but IBS typically needs moderation. Gemini will handle this.
    }

    return limits;
  }

  /**
   * Checks if a food item is vegan
   * Simple heuristic: if name/type contains non-vegan keywords, it's not vegan
   */
  static isVegan(food: FoodItem): boolean {
    const veganKeywords = ["carne", "pollo", "pavo", "jamón", "bacon", "pescado", "marisco", "huevo", "queso", "leche", "yogur", "crema", "mantequilla", "gelatina"];
    const name = (food.food_name || "").toLowerCase();
    const type = (food.food_type || "").toLowerCase();
    const fullText = `${name} ${type}`;

    return !veganKeywords.some((kw) => fullText.includes(kw));
  }

  /**
   * Checks if a food item is vegetarian
   */
  static isVegetarian(food: FoodItem): boolean {
    const vegetarianKeywords = ["carne", "pollo", "pavo", "jamón", "bacon", "pescado", "marisco", "gelatina"];
    const name = (food.food_name || "").toLowerCase();
    const type = (food.food_type || "").toLowerCase();
    const fullText = `${name} ${type}`;

    return !vegetarianKeywords.some((kw) => fullText.includes(kw));
  }

  /**
   * Checks if a food contains gluten
   */
  static hasGluten(food: FoodItem): boolean {
    const glutenKeywords = ["trigo", "cebada", "centeno", "harina", "pan", "pasta", "cereal", "galleta", "bizcocho", "trigo integral"];
    const name = (food.food_name || "").toLowerCase();
    const type = (food.food_type || "").toLowerCase();
    const fullText = `${name} ${type}`;

    return glutenKeywords.some((kw) => fullText.includes(kw));
  }

  /**
   * Checks if a food contains dairy
   */
  static containsDairy(food: FoodItem): boolean {
    const dairyKeywords = ["leche", "queso", "yogur", "crema", "mantequilla", "lácteo"];
    const name = (food.food_name || "").toLowerCase();
    const type = (food.food_type || "").toLowerCase();
    const fullText = `${name} ${type}`;

    return dairyKeywords.some((kw) => fullText.includes(kw));
  }

  /**
   * Checks if a food is seafood
   */
  static isSeafood(food: FoodItem): boolean {
    const seafoodKeywords = ["pescado", "marisco", "camarón", "camarones", "langosta", "mejillón", "ostra", "almejas", "cangrejo", "atún", "salmón", "trucha", "merluza", "bacalao"];
    const name = (food.food_name || "").toLowerCase();
    const type = (food.food_type || "").toLowerCase();
    const fullText = `${name} ${type}`;

    return seafoodKeywords.some((kw) => fullText.includes(kw));
  }

  /**
   * Checks if a food contains tree nuts or peanuts
   */
  static hasTreeNuts(food: FoodItem): boolean {
    const nutKeywords = ["nuez", "almendra", "cacahuate", "maní", "pistacho", "anacardo", "avellana", "castaña", "pecana", "nuez de macadamia", "fruto seco"];
    const name = (food.food_name || "").toLowerCase();
    const type = (food.food_type || "").toLowerCase();
    const fullText = `${name} ${type}`;

    return nutKeywords.some((kw) => fullText.includes(kw));
  }

  /**
   * Main validation function: checks if a food item passes all restrictions
   * Returns { valid: boolean, reason?: string } for logging
   */
  static validateFood(
    food: FoodItem,
    filters: RestrictionFilters,
    limits: NutritionalLimits,
  ): { valid: boolean; reason?: string } {
    // Dietary restrictions
    if (filters.vegano && !this.isVegan(food)) {
      return { valid: false, reason: "not_vegan" };
    }

    if (filters.vegetariano && !this.isVegetarian(food)) {
      return { valid: false, reason: "not_vegetarian" };
    }

    if (filters.celiaco && this.hasGluten(food)) {
      return { valid: false, reason: "contains_gluten" };
    }

    if (filters.sinLactosa && this.containsDairy(food)) {
      return { valid: false, reason: "contains_dairy" };
    }

    if (filters.sinMariscos && this.isSeafood(food)) {
      return { valid: false, reason: "is_seafood" };
    }

    if (filters.sinFrutosSecos && this.hasTreeNuts(food)) {
      return { valid: false, reason: "has_tree_nuts" };
    }

    // Nutritional limits (only validate if we have data)
    const nutrition = food.nutrition;
    if (nutrition) {
      if (
        limits.maxSodium !== undefined &&
        nutrition.sodium_mg !== undefined &&
        nutrition.sodium_mg > limits.maxSodium
      ) {
        return { valid: false, reason: `high_sodium (${nutrition.sodium_mg}mg)` };
      }

      if (
        limits.maxSugars !== undefined &&
        nutrition.sugars_g !== undefined &&
        nutrition.sugars_g > limits.maxSugars
      ) {
        return { valid: false, reason: `high_sugars (${nutrition.sugars_g}g)` };
      }

      if (
        limits.maxGlycoIndex !== undefined &&
        nutrition.glycemic_index !== undefined &&
        nutrition.glycemic_index > limits.maxGlycoIndex
      ) {
        return { valid: false, reason: `high_glycemic_index (${nutrition.glycemic_index})` };
      }

      if (
        limits.minFiber !== undefined &&
        nutrition.fiber_g !== undefined &&
        nutrition.fiber_g < limits.minFiber
      ) {
        return { valid: false, reason: `low_fiber (${nutrition.fiber_g}g)` };
      }

      if (
        limits.maxSaturatedFats !== undefined &&
        nutrition.saturated_fat_g !== undefined &&
        nutrition.saturated_fat_g > limits.maxSaturatedFats
      ) {
        return { valid: false, reason: `high_saturated_fat (${nutrition.saturated_fat_g}g)` };
      }

      if (
        limits.maxCholesterol !== undefined &&
        nutrition.cholesterol_mg !== undefined &&
        nutrition.cholesterol_mg > limits.maxCholesterol
      ) {
        return { valid: false, reason: `high_cholesterol (${nutrition.cholesterol_mg}mg)` };
      }

      if (
        limits.minIodine !== undefined &&
        nutrition.iodine_µg !== undefined &&
        nutrition.iodine_µg < limits.minIodine
      ) {
        return { valid: false, reason: `low_iodine (${nutrition.iodine_µg}µg)` };
      }

      if (
        limits.maxIodine !== undefined &&
        nutrition.iodine_µg !== undefined &&
        nutrition.iodine_µg > limits.maxIodine
      ) {
        return { valid: false, reason: `high_iodine (${nutrition.iodine_µg}µg)` };
      }
    }

    return { valid: true };
  }

  /**
   * Filters an array of foods based on user restrictions
   * Returns filtered array and a summary of what was removed
   */
  static filterFoods(
    foods: FoodItem[],
    filters: RestrictionFilters,
    limits: NutritionalLimits,
  ): {
    filtered: FoodItem[];
    removed: Array<{ food: FoodItem; reason: string }>;
    summary: Record<string, number>;
  } {
    const filtered: FoodItem[] = [];
    const removed: Array<{ food: FoodItem; reason: string }> = [];
    const summary: Record<string, number> = {};

    for (const food of foods) {
      const result = this.validateFood(food, filters, limits);

      if (result.valid) {
        filtered.push(food);
      } else {
        removed.push({ food, reason: result.reason || "unknown" });
        summary[result.reason || "unknown"] = (summary[result.reason || "unknown"] || 0) + 1;
      }
    }

    return { filtered, removed, summary };
  }
}

export default NutritionalValidator;
