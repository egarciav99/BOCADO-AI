/**
 * Recipe History Manager
 *
 * Manages user recipe history to prevent repetition.
 * Replicates the "Leer Historial" node from the N8N workflow.
 *
 * This ensures users don't get the same recipes multiple times,
 * improving their experience and encouraging dietary variety.
 */

import { FieldValue } from 'firebase-admin/firestore';

export interface RecipeRecord {
  id: string;
  usuario: string;
  user_id: string;
  titulo?: string; // For parsed recipes
  receta?: {
    recetas?: Array<{ titulo: string; id?: number }>;
  };
  fecha_creacion?: any;
  timestamp?: FieldValue;
}

export interface HistoryContext {
  forbiddenTitles: string[];
  historyInstruction: string;
  previousCount: number;
}

export class RecipeHistoryManager {
  private db: any;
  private collectionName = 'user_interactions';

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Gets previous recipes for a user
   * Queries Firestore for recently generated recipes
   */
  async getPreviousRecipes(
    userId: string,
    limit: number = 5,
  ): Promise<RecipeRecord[]> {
    try {
      if (!this.db) {
        console.warn('[RecipeHistory] Firestore not initialized');
        return [];
      }

      const snapshot = await this.db
        .collection(this.collectionName)
        .where('user_id', '==', userId)
        .where('procesado', '==', true)
        .orderBy('fecha_creacion', 'desc')
        .limit(limit)
        .get();

      if (snapshot.empty) {
        console.log(`[RecipeHistory] No previous recipes found for user ${userId}`);
        return [];
      }

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[RecipeHistory] Error fetching previous recipes:', error);
      return [];
    }
  }

  /**
   * Extracts all recipe titles from history
   * Handles both old and new format
   */
  private extractTitles(recipes: RecipeRecord[]): string[] {
    const titles = new Set<string>();

    for (const record of recipes) {
      // New format: receta.recetas[].titulo
      if (record.receta?.recetas && Array.isArray(record.receta.recetas)) {
        record.receta.recetas.forEach((r: any) => {
          if (r.titulo) {
            titles.add(r.titulo.toLowerCase().trim());
          }
        });
      }

      // Old format: top-level titulo field
      if (record.titulo) {
        titles.add(record.titulo.toLowerCase().trim());
      }
    }

    return Array.from(titles);
  }

  /**
   * Checks if a recipe title is new (not in history)
   */
  async isRecipeNew(userId: string, titulo: string): Promise<boolean> {
    const previousRecipes = await this.getPreviousRecipes(userId, 10);
    const forbiddenTitles = this.extractTitles(previousRecipes);
    const normalizedTitulo = titulo.toLowerCase().trim();

    return !forbiddenTitles.some(
      (t) =>
        t === normalizedTitulo ||
        // Check for similar titles (fuzzy match for slight variations)
        this.areSimular(t, normalizedTitulo),
    );
  }

  /**
   * Simple fuzzy match for recipe titles
   * Handles variations like "Pollo al Horno" vs "Pollo Asado al Horno"
   */
  private areSimular(title1: string, title2: string): boolean {
    // If one is substring of other (with some flexibility)
    const t1Words = title1.split(/\s+/);
    const t2Words = title2.split(/\s+/);

    // Count matching words (at least 2 words must match)
    const matchingWords = t1Words.filter((w) => t2Words.includes(w)).length;
    return matchingWords >= 2;
  }

  /**
   * Builds the history context instruction for Gemini
   * Formatted similar to the N8N workflow "BuiltPrompt" node
   */
  async buildHistoryContext(previousRecipes: RecipeRecord[]): Promise<HistoryContext> {
    const forbiddenTitles = this.extractTitles(previousRecipes);

    if (forbiddenTitles.length === 0) {
      return {
        forbiddenTitles: [],
        historyInstruction: 'No hay historial previo. Genera recetas nuevas y creativas.',
        previousCount: 0,
      };
    }

    const historyInstruction = `
### 🧠 MEMORIA (CRÍTICO - NO REPETIR)
El usuario YA cocinó estas recetas recientemente.
**ESTÁ PROHIBIDO REPETIR ESTOS TÍTULOS O PLATOS MUY SIMILARES:**

${forbiddenTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

**INSTRUCCIÓN:**
- Genera recetas NUEVAS y DIFERENTES
- Varía los ingredientes principales
- Cambia las técnicas de cocción
- Mantén variedad en la dieta del usuario
    `.trim();

    return {
      forbiddenTitles,
      historyInstruction,
      previousCount: forbiddenTitles.length,
    };
  }

  /**
   * Formats history context for the prompt (alternative version)
   * More concise format for token optimization
   */
  buildHistoryContextConcise(forbiddenTitles: string[]): string {
    if (forbiddenTitles.length === 0) {
      return '### 📝 Historial: Ninguno. Genera recetas creativas.';
    }

    return `### 📝 Historial (NO REPETIR): ${forbiddenTitles.slice(0, 3).join(', ')}${forbiddenTitles.length > 3 ? '...' : ''}`;
  }

  /**
   * Validates if all generated recipes are new (no repetition)
   * Used for quality assurance
   */
  async validateNoRepetition(
    userId: string,
    generatedTitles: string[],
  ): Promise<{ valid: boolean; repeated: string[] }> {
    const previousRecipes = await this.getPreviousRecipes(userId, 10);
    const forbiddenTitles = this.extractTitles(previousRecipes);

    const repeated = generatedTitles.filter((title) =>
      forbiddenTitles.some(
        (forbidden) =>
          this.areSimular(title.toLowerCase(), forbidden) ||
          forbidden.includes(title.toLowerCase()),
      ),
    );

    return {
      valid: repeated.length === 0,
      repeated,
    };
  }

  /**
   * Gets statistics about user's recipe history
   * Useful for analytics
   */
  async getHistoryStats(userId: string): Promise<{
    totalRecipes: number;
    uniqueTitles: number;
    mostCommonIngredients: string[];
    lastRecipeDate: Date | null;
  }> {
    try {
      const allRecipes = await this.getPreviousRecipes(userId, 50); // Get more to analyze

      const uniqueTitles = new Set<string>();
      let lastRecipeDate: Date | null = null;

      for (const recipe of allRecipes) {
        if (recipe.receta?.recetas) {
          recipe.receta.recetas.forEach((r: any) => {
            if (r.titulo) {
              uniqueTitles.add(r.titulo);
            }
          });
        }
        if (recipe.fecha_creacion) {
          const date = recipe.fecha_creacion.toDate?.() || new Date(recipe.fecha_creacion);
          if (!lastRecipeDate || date > lastRecipeDate) {
            lastRecipeDate = date;
          }
        }
      }

      return {
        totalRecipes: allRecipes.length,
        uniqueTitles: uniqueTitles.size,
        mostCommonIngredients: [], // Could be enhanced with ingredient analysis
        lastRecipeDate,
      };
    } catch (error) {
      console.error('[RecipeHistory] Error getting stats:', error);
      return {
        totalRecipes: 0,
        uniqueTitles: 0,
        mostCommonIngredients: [],
        lastRecipeDate: null,
      };
    }
  }
}

export default RecipeHistoryManager;
