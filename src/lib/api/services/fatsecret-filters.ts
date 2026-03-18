/**
 * FatSecret Filters
 * 
 * Integrates the NutritionalValidator with FatSecret API results.
 * Filters food items returned from FatSecret searches based on user restrictions.
 */

import NutritionalValidator, {
  RestrictionFilters,
  NutritionalLimits,
  FoodItem,
} from './nutritional-validator';

export interface FatSecretFilterResult {
  originalCount: number;
  filteredCount: number;
  removedCount: number;
  filteredFoods: FoodItem[];
  filtersSummary: RestrictionFilters;
  limitsSummary: NutritionalLimits;
  removalReasons: Record<string, number>;
}

/**
 * Filters FatSecret food results based on user profile
 */
export function filterFatSecretResults(
  foods: FoodItem[],
  userProfile: any,
  logFn?: (message: string) => void,
): FatSecretFilterResult {
  const log = logFn || console.log;

  // Step 1: Build filters from user profile
  const filters = NutritionalValidator.buildFiltersFromProfile(userProfile);
  const limits = NutritionalValidator.buildNutritionalLimits(filters);

  // Log active restrictions
  const activeFilters = Object.entries(filters)
    .filter(([_, v]) => v)
    .map(([k]) => k);
  const activeLimits = Object.keys(limits).filter((k) => limits[k as keyof NutritionalLimits]);

  log(`[FatSecret Filter] Active restrictions: ${activeFilters.join(", ") || "none"}`);
  log(`[FatSecret Filter] Active limits: ${activeLimits.join(", ") || "none"}`);

  // Step 2: Filter foods
  const { filtered, summary } = NutritionalValidator.filterFoods(foods, filters, limits);

  // Step 3: Log results
  log(
    `[FatSecret Filter] Filtering complete: ${foods.length} → ${filtered.length} foods (removed ${foods.length - filtered.length})`,
  );
  if (Object.keys(summary).length > 0) {
    log(`[FatSecret Filter] Removal reasons:`, summary);
  }

  return {
    originalCount: foods.length,
    filteredCount: filtered.length,
    removedCount: foods.length - filtered.length,
    filteredFoods: filtered,
    filtersSummary: filters,
    limitsSummary: limits,
    removalReasons: summary,
  };
}

/**
 * Converts a FatSecret API response to our FoodItem format
 * Handles the structure returned by FatSecret v1 API
 */
export function convertFatSecretFoodToItem(fatSecretFood: any): FoodItem {
  return {
    food_name: fatSecretFood.food_name || "",
    food_type: fatSecretFood.food_type || "generic",
    servings: fatSecretFood.servings,
    // Nutritional data can be enriched from servings if available
    nutrition: extractNutritionFromServings(fatSecretFood.servings),
  };
}

/**
 * Extracts nutritional data from FatSecret serving info
 * FatSecret servings structure is complex; this handles the common case
 */
function extractNutritionFromServings(servings: any): any | undefined {
  if (!servings) return undefined;

  // If servings is an array, get the first one (typically "per 100g")
  const serving = Array.isArray(servings.serving)
    ? servings.serving[0]
    : servings.serving;

  if (!serving) return undefined;

  return {
    calories: parseFloat(serving.calories) || undefined,
    protein_g: parseFloat(serving.protein) || undefined,
    carbs_g: parseFloat(serving.carbohydrate) || undefined,
    fat_g: parseFloat(serving.fat) || undefined,
    fiber_g: parseFloat(serving.fiber) || undefined,
    sodium_mg: parseFloat(serving.sodium) || undefined,
    sugars_g: parseFloat(serving.sugar) || undefined,
    saturated_fat_g: parseFloat(serving.saturated_fat) || undefined,
    cholesterol_mg: parseFloat(serving.cholesterol) || undefined,
    // Note: FatSecret API may not provide iodine or glycemic index
    // Those would need to be enriched from another source
  };
}

/**
 * Main function: Process FatSecret results through filtering pipeline
 * Returns ingredient lists suitable for Gemini prompt
 */
export function processFatSecretResults(
  foods: FoodItem[],
  userProfile: any,
  maxIngredientsPerList: number = 40,
  logFn?: (message: string) => void,
): {
  priorityList: string;
  marketList: string;
  filterResult: FatSecretFilterResult;
} {
  const filterResult = filterFatSecretResults(foods, userProfile, logFn);

  // Split into priority and market lists (if needed)
  const priorityList = filterResult.filteredFoods
    .slice(0, maxIngredientsPerList)
    .map((f) => f.food_name)
    .join(", ");

  const marketList = filterResult.filteredFoods
    .slice(maxIngredientsPerList, maxIngredientsPerList * 2)
    .map((f) => f.food_name)
    .join(", ");

  return {
    priorityList,
    marketList,
    filterResult,
  };
}

export default {
  filterFatSecretResults,
  convertFatSecretFoodToItem,
  processFatSecretResults,
};
