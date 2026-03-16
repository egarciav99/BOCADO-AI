import { searchFatSecretIngredients, getFatSecretFood } from '../utils/fatsecret';

interface RecipeMacros {
  kcal: number;
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
}

interface Recipe {
  id: string | number;
  titulo: string;
  ingredientes: string[];
  macros_por_porcion?: RecipeMacros;
  [key: string]: any;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Enriquece los macros de una receta usando FatSecret API
 * Busca cada ingrediente y calcula totales nutricionales
 */
export class NutritionEnricher {
  private static SEARCH_DELAY_MS = 300; // Delay entre búsquedas para respetar rate limit
  private static MAX_INGREDIENT_SEARCHES = 10; // Máximo de ingredientes a buscar por receta

  /**
   * Parsea cantidad de un ingrediente (ej: "200g pollo" -> 200)
   * Retorna null si no se encuentra cantidad
   */
  private static parseQuantity(ingredient: string): number | null {
    // Buscar patrones como: "200g", "1 taza", "2 cucharadas", etc.
    const patterns = [
      /(\d+\.?\d*)\s*g(?:ramos?)?/i,
      /(\d+\.?\d*)\s*kg/i,
      /(\d+\.?\d*)\s*ml/i,
      /(\d+\.?\d*)\s*l(?:itros?)?/i,
      /(\d+\.?\d*)\s*oz/i,
      /(\d+\.?\d*)\s*tazas?/i,
      /(\d+\.?\d*)\s*cucharadas?/i,
    ];

    for (const pattern of patterns) {
      const match = ingredient.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  /**
   * Limpia el nombre del ingrediente para búsqueda
   * Ej: "200g de pollo" -> "pollo"
   */
  private static cleanIngredientName(ingredient: string): string {
    return ingredient
      .replace(/(\d+\.?\d*)\s*(g|kg|ml|l|oz|tazas?|cucharadas?|piezas?|unidades?)/gi, '')
      .replace(/\bde\b|\ba\b|\bcon\b/gi, '')
      .trim();
  }

  /**
   * Busca datos nutricionales de un ingrediente en FatSecret
   */
  private static async searchIngredientNutrition(
    ingredient: string,
    region: string,
    language: string,
  ): Promise<NutritionData | null> {
    try {
      const cleanName = this.cleanIngredientName(ingredient);
      if (!cleanName || cleanName.length < 2) return null;

      console.log(`[Nutrition] Searching FatSecret: "${cleanName}"`);
      
      const results = await searchFatSecretIngredients(cleanName, 10, region, language);
      
      if (!results || results.length === 0) {
        console.log(`[Nutrition] No results for "${cleanName}"`);
        return null;
      }

      // Tomar el primer resultado (más relevante)
      const firstResult = results[0];
      const foodId = firstResult.food_id;
      
      if (!foodId) {
        console.log(`[Nutrition] No food_id for "${cleanName}"`);
        return null;
      }

      // Obtener detalles completos
      const foodDetails = await getFatSecretFood(foodId, region, language);
      
      // Parsear servings
      const servings = foodDetails?.servings?.serving;
      if (!servings) {
        console.log(`[Nutrition] No servings data for "${cleanName}"`);
        return null;
      }

      // Tomar el primer serving como referencia (usualmente per 100g)
      const serving = Array.isArray(servings) ? servings[0] : servings;
      
      return {
        calories: parseFloat(serving.calories || 0),
        protein: parseFloat(serving.protein || 0),
        carbs: parseFloat(serving.carbohydrate || 0),
        fat: parseFloat(serving.fat || 0),
        confidence: 'high',
      };
    } catch (error) {
      console.error(`[Nutrition] Error searching "${ingredient}":`, error);
      return null;
    }
  }

  /**
   * Calcula macros totales de una receta sumando todos los ingredientes
   */
  private static async calculateRecipeMacros(
    ingredientes: string[],
    region: string,
    language: string,
    porciones: number = 1,
  ): Promise<RecipeMacros | null> {
    const limitedIngredients = ingredientes.slice(0, this.MAX_INGREDIENT_SEARCHES);
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let successfulSearches = 0;

    for (const ingredient of limitedIngredients) {
      const nutrition = await this.searchIngredientNutrition(ingredient, region, language);
      
      if (nutrition) {
        totalCalories += nutrition.calories;
        totalProtein += nutrition.protein;
        totalCarbs += nutrition.carbs;
        totalFat += nutrition.fat;
        successfulSearches++;
      }

      // Delay para respetar rate limit
      await new Promise(resolve => setTimeout(resolve, this.SEARCH_DELAY_MS));
    }

    // Si no conseguimos datos de al menos 30% de ingredientes, retornar null
    if (successfulSearches < Math.max(1, limitedIngredients.length * 0.3)) {
      console.log(`[Nutrition] Insufficient data: ${successfulSearches}/${limitedIngredients.length} ingredients found`);
      return null;
    }

    console.log(`[Nutrition] ✅ Calculated macros from ${successfulSearches}/${limitedIngredients.length} ingredients`);

    // Dividir entre porciones
    return {
      kcal: Math.round(totalCalories / porciones),
      proteinas_g: Math.round(totalProtein / porciones),
      carbohidratos_g: Math.round(totalCarbs / porciones),
      grasas_g: Math.round(totalFat / porciones),
    };
  }

  /**
   * Enriquece una o más recetas con datos nutricionales de FatSecret
   * Si FatSecret falla o no hay datos suficientes, mantiene los macros de Gemini
   */
  static async enrichRecipes(
    recipes: Recipe[],
    country: string = 'MX',
    language: string = 'es',
    enabled: boolean = true,
  ): Promise<Recipe[]> {
    // Si FatSecret está deshabilitado, retornar recetas sin modificar
    if (!enabled) {
      console.log('[Nutrition] Enrichment disabled, using Gemini macros');
      return recipes;
    }

    // Verificar credenciales
    if (!process.env.FATSECRET_KEY || !process.env.FATSECRET_SECRET) {
      console.warn('[Nutrition] FatSecret credentials not found, using Gemini macros');
      return recipes;
    }

    // Mapeo de país a region code de FatSecret
    const regionMap: Record<string, string> = {
      MX: 'MX',
      US: 'US',
      ES: 'ES',
      AR: 'AR',
      CO: 'CO',
      CL: 'CL',
      PE: 'PE',
    };
    const region = regionMap[country] || 'US';

    console.log(`[Nutrition] 🔍 Enriching ${recipes.length} recipes with FatSecret (region: ${region})`);
    const startTime = Date.now();

    const enrichedRecipes = [];

    for (const recipe of recipes) {
      try {
        // Si no hay ingredientes, mantener sin cambios
        if (!recipe.ingredientes || recipe.ingredientes.length === 0) {
          enrichedRecipes.push(recipe);
          continue;
        }

        // Calcular macros desde FatSecret
        const fatSecretMacros = await this.calculateRecipeMacros(
          recipe.ingredientes,
          region,
          language,
        );

        // Si FatSecret devuelve datos, usarlos; si no, mantener los de Gemini
        if (fatSecretMacros) {
          console.log(`[Nutrition] ✅ "${recipe.titulo}": FatSecret macros applied`);
          enrichedRecipes.push({
            ...recipe,
            macros_por_porcion: fatSecretMacros,
          });
        } else {
          console.log(`[Nutrition] ⚠️ "${recipe.titulo}": Using Gemini macros (FatSecret failed)`);
          enrichedRecipes.push(recipe);
        }
      } catch (error) {
        console.error(`[Nutrition] Error enriching "${recipe.titulo}":`, error);
        // En caso de error, mantener receta original
        enrichedRecipes.push(recipe);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Nutrition] ✅ Enrichment completed in ${duration}ms`);

    return enrichedRecipes;
  }
}
