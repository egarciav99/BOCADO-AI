/**
 * Ingredient Scorer
 *
 * Replicates the "Score" node from the N8N workflow.
 *
 * Scores and prioritizes ingredients based on:
 * 1. Whether they exist in user's pantry
 * 2. Whether they pass nutritional validation
 * 3. Their relevance to the meal type
 *
 * Returns:
 * - priorityList: Ingredients user already has at home
 * - marketList: Ingredients user needs to buy
 * - hasPantryItems: Boolean indicating if any pantry match found
 */

export interface ScoredIngredientsResult {
  priorityList: string;
  marketList: string;
  hasPantryItems: boolean;
  stats: {
    totalIngredients: number;
    fromPantry: number;
    needToBuy: number;
    pantryMatchPercentage: number;
  };
}

export class IngredientScorer {
  /**
   * Main scoring function
   * Differentiates between ingredients user has vs needs to buy
   */
  static scoreIngredients(
    safeIngredients: string[],
    pantryItems: string[],
  ): ScoredIngredientsResult {
    if (!safeIngredients || safeIngredients.length === 0) {
      return {
        priorityList: '',
        marketList: '',
        hasPantryItems: false,
        stats: {
          totalIngredients: 0,
          fromPantry: 0,
          needToBuy: 0,
          pantryMatchPercentage: 0,
        },
      };
    }

    // Normalize ingredient names for comparison
    const normalizedPantryItems = pantryItems.map((item) =>
      this.normalizeIngredientName(item),
    );

    const priorityIngredients: string[] = [];
    const marketIngredients: string[] = [];

    for (const ingredient of safeIngredients) {
      const normalizedIngredient = this.normalizeIngredientName(ingredient);

      // Check if ingredient matches anything in pantry
      const foundInPantry = normalizedPantryItems.some((pantryItem) =>
        this.isIngredientMatch(normalizedIngredient, pantryItem),
      );

      if (foundInPantry) {
        priorityIngredients.push(ingredient);
      } else {
        marketIngredients.push(ingredient);
      }
    }

    const stats = {
      totalIngredients: safeIngredients.length,
      fromPantry: priorityIngredients.length,
      needToBuy: marketIngredients.length,
      pantryMatchPercentage: Math.round(
        (priorityIngredients.length / safeIngredients.length) * 100,
      ),
    };

    return {
      priorityList: priorityIngredients.join(', '),
      marketList: marketIngredients.join(', '),
      hasPantryItems: priorityIngredients.length > 0,
      stats,
    };
  }

  /**
   * Normalizes ingredient name for comparison
   * Removes quantities, measurements, and standardizes text
   *
   * Examples:
   * "100g de Pollo" → "pollo"
   * "1 cebolla grande" → "cebolla"
   * "3 cdtas de Aceite" → "aceite"
   */
  private static normalizeIngredientName(ingredient: string): string {
    if (!ingredient) return '';

    return (
      ingredient
        // Remove quantities and measurements
        .replace(/^\d+\s*(?:g|kg|ml|l|cdta|cda|taza|tazas|porciones?)?\.?\s+/gi, '')
        // Remove adjectives (grande, pequeño, molido, etc)
        .replace(
          /\s+(grande|pequeño|pequeña|molido|molida|fresco|fresca|enlatado|deshidratado|picado|picada|rallado|rallada|cocido|cocida|crudo|cruda|seco|seca)/gi,
          '',
        )
        // Remove "de" and "del"
        .replace(/\s+de\s+|del\s+/gi, ' ')
        // Remove prepositions
        .replace(/\s+(para|al|a la|en|con|sin)\s+/gi, ' ')
        // Clean whitespace
        .trim()
        .toLowerCase()
    );
  }

  /**
   * Checks if an ingredient matches a pantry item
   * Uses fuzzy matching to handle variations
   */
  private static isIngredientMatch(ingredient: string, pantryItem: string): boolean {
    // Exact match
    if (ingredient === pantryItem) {
      return true;
    }

    // One contains the other (substring match)
    if (ingredient.includes(pantryItem) || pantryItem.includes(ingredient)) {
      return true;
    }

    // Word-level fuzzy match
    // "pollo asado" vs "pollo" should match
    const ingredientWords = ingredient.split(/\s+/).filter((w) => w.length > 2);
    const pantryWords = pantryItem.split(/\s+/).filter((w) => w.length > 2);

    // Check if at least one word matches (excluding common words)
    const commonWords = new Set(['de', 'que', 'para', 'con', 'sin', 'del', 'los', 'las']);
    const ingredientKeywords = ingredientWords.filter((w) => !commonWords.has(w));
    const pantryKeywords = pantryWords.filter((w) => !commonWords.has(w));

    if (ingredientKeywords.length === 0 || pantryKeywords.length === 0) {
      return false;
    }

    // Check for keyword overlap
    return ingredientKeywords.some((keyword) => pantryKeywords.includes(keyword));
  }

  /**
   * Gets ingredient category based on name
   * Useful for organizing recommendations
   */
  static categorizeIngredient(
    ingredient: string,
  ): 'proteina' | 'verdura' | 'fruta' | 'lacteo' | 'grano' | 'condimento' | 'otro' {
    const normalized = ingredient.toLowerCase();

    // Proteínas
    if (
      /pollo|carne|pavo|pescado|atún|salmón|huevo|tofu|lentejas|frijoles|garbanzos|mariscos|camarón/i.test(
        normalized,
      )
    ) {
      return 'proteina';
    }

    // Verduras
    if (
      /lechuga|tomate|cebolla|ajo|brócoli|zanahoria|papas?|camote|pimiento|pepino|champiñón|nabo|remolacha|chícharo|verde/i.test(
        normalized,
      )
    ) {
      return 'verdura';
    }

    // Frutas
    if (
      /manzana|plátano|naranja|limón|fresa|uva|melón|sandía|piña|papaya|mango|kiwi|ciruela|cereza/i.test(
        normalized,
      )
    ) {
      return 'fruta';
    }

    // Lácteos
    if (
      /leche|queso|yogur|crema|mantequilla|requesón|suero|nata|helado/i.test(normalized)
    ) {
      return 'lacteo';
    }

    // Granos y almidones
    if (
      /arroz|pasta|pan|harina|avena|maíz|cereal|trigo|cebada|centeno|quinua|cuscús/i.test(
        normalized,
      )
    ) {
      return 'grano';
    }

    // Condimentos
    if (
      /sal|pimienta|aceite|vinagre|salsa|mostaza|mayonesa|especias|oregano|albahaca|tomillo|comino/i.test(
        normalized,
      )
    ) {
      return 'condimento';
    }

    return 'otro';
  }

  /**
   * Generates ingredient suggestion text
   * Suitable for including in prompts
   */
  static generateIngredientContext(result: ScoredIngredientsResult): string {
    if (result.stats.totalIngredients === 0) {
      return '🛒 No hay ingredientes seguros disponibles. Usar ingredientes básicos (aceite, sal, especias).';
    }

    let context = '🛒 GESTIÓN DE INVENTARIO\n';

    if (result.hasPantryItems) {
      context += `\n**Ingredientes en casa (PRIORIDAD):**\n${result.priorityList}\n`;
      context += `*(${result.stats.fromPantry} de ${result.stats.totalIngredients} ingredientes - ${result.stats.pantryMatchPercentage}% de coincidencia)*\n`;
    }

    if (result.marketList) {
      context += `\n**Ingredientes que necesitas comprar:**\n${result.marketList}\n`;
    }

    return context;
  }

  /**
   * Validates ingredient list for quality
   * Ensures variety and balanced nutrition
   */
  static validateIngredientsVariety(ingredients: string[]): {
    valid: boolean;
    issues: string[];
    stats: {
      proteinas: number;
      verduras: number;
      frutas: number;
      lacteos: number;
      granos: number;
    };
  } {
    const categories = {
      proteina: 0,
      verdura: 0,
      fruta: 0,
      lacteo: 0,
      grano: 0,
    };

    for (const ingredient of ingredients) {
      const category = this.categorizeIngredient(ingredient);
      if (category !== 'condimento' && category !== 'otro') {
        categories[category]++;
      }
    }

    const issues: string[] = [];

    if (categories.proteina === 0) {
      issues.push('Falta proteína en la lista de ingredientes');
    }
    if (categories.verdura === 0 && categories.fruta === 0) {
      issues.push('Falta vegetales y frutas en la lista');
    }
    if (categories.grano === 0) {
      issues.push('Falta carbohidratos (granos) en la lista');
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        proteinas: categories.proteina,
        verduras: categories.verdura,
        frutas: categories.fruta,
        lacteos: categories.lacteo,
        granos: categories.grano,
      },
    };
  }
}

export default IngredientScorer;
