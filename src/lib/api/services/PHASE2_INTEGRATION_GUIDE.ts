/**
 * INTEGRATION GUIDE - Phase 2
 *
 * How to integrate RecipeHistoryManager, IngredientScorer,
 * and FatSecret location search into recommend.ts
 *
 * This guide shows where to add each component and what metadata to store.
 */

/*
// ============================================
// PASO 1: AGREGAR IMPORTS (En recommend.ts línea ~25)
// ============================================

import RecipeHistoryManager from '../../lib/api/services/recipe-history';
import IngredientScorer from '../../lib/api/services/ingredient-scorer';
import {
  searchFatSecretByLocation,
  searchMealByDescription,
} from '../../lib/api/utils/fatsecret';
*/

/*
// ============================================
// PASO 2: RAMA "EN CASA" - Línea ~1043
// ============================================

if (type === 'En casa') {
  // 2a. Obtener historial de recetas (NUEVO)
  const historyManager = new RecipeHistoryManager(db);
  const previousRecipes = await historyManager.getPreviousRecipes(userId, 5);
  const { historyInstruction, forbiddenTitles } =
    await historyManager.buildHistoryContext(previousRecipes);

  // 2b. Filtrar ingredientes (YA EXISTE)
  const allIngredients = await dataService.getAllIngredients();
  const filteredItems = filterIngredientes(allIngredients, user);
  const pantryItems = await dataService.getPantryItems(userId);

  // 2c. NUEVO: Puntuar ingredientes (mejora existente)
  const { priorityList, marketList, hasPantryItems, stats } =
    IngredientScorer.scoreIngredients(
      filteredItems.map((i) => i.name),
      pantryItems.map((p) => p.name),
    );

  // 2d. Preparar contexto mejorado
  const diseases = ensureArray(user.diseases);
  const allergies = ensureArray(user.allergies);
  const otherAllergiesText = user.otherAllergies || '';
  const medicalContext = [...diseases, ...allergies, otherAllergiesText]
    .filter(Boolean)
    .join(', ');

  const dislikedFoodsContext = [
    ...ensureArray(user.dislikedFoods),
    ...ensureArray(request.dislikedFoods),
  ]
    .filter(Boolean)
    .join(', ');

  const cookingAffinityLower = (user.cookingAffinity || '').toLowerCase();
  const difficultyHint =
    cookingAffinityLower.includes('novato') ||
    cookingAffinityLower.includes('no me gusta')
      ? ', dificultad máxima: Fácil'
      : '';

  const pantryRule = request.onlyPantryIngredients
    ? 'usar SOLO ingredientes de la despensa (sin excepciones, sin básicos)'
    : 'usar despensa primero, respetar restricciones. Opcionales: básicos (aceite, sal, especias)';

  // 2e. NUEVO: Generar contexto de inventario mejorado
  const inventoryContext = IngredientScorer.generateIngredientContext({
    priorityList,
    marketList,
    hasPantryItems,
    stats,
  });

  // 2f. Construir Prompt con todos los contextos
  finalPrompt = PromptBuilder.buildRecipePrompt({
    type: 'En casa',
    mealType: request.mealType || 'Comida',
    cookingTime: request.cookingTime as number,
    dietaryGoal: Array.isArray(user.nutritionalGoal)
      ? user.nutritionalGoal.join(', ')
      : user.nutritionalGoal || 'comer saludable',
    medicalContext: PromptBuilder.escapeUserInput(medicalContext),
    dislikedFoodsContext: PromptBuilder.escapeUserInput(dislikedFoodsContext),
    historyContext: historyInstruction, // NUEVO ✅
    feedbackContext,
    pantryContext: priorityList,
    marketList,
    inventoryContext: inventoryContext, // NUEVO ✅
    onlyPantryIngredients: request.onlyPantryIngredients,
    city: user.city,
    country: user.country,
    language: request.language,
    difficultyHint,
    pantryRule,
  });
}
*/

/*
// ============================================
// PASO 3: RAMA "FUERA" - Línea ~1126
// ============================================

else {
  // 3a. Obtener coordenadas
  const searchCoords = getSearchCoordinates(request, user);
  if (!user.city && !searchCoords) {
    throw new Error('Ubicación no disponible.');
  }

  // 3b. NUEVO: Buscar en FatSecret por ubicación
  let fatSecretResults: any[] = [];
  try {
    // Intenta búsqueda por ubicación si están disponibles coordenadas
    if (searchCoords && (request.cravings || searchCoords)) {
      const craving = Array.isArray(request.cravings)
        ? request.cravings[0]
        : request.cravings;

      fatSecretResults = await searchMealByDescription(
        craving || 'saludable',
        {
          cuisine: user.country === 'MX' ? 'mexican' : undefined,
          dietary: user.allergies?.[0]?.toLowerCase(),
        },
      );

      safeLog('log', `[FatSecret] Found ${fatSecretResults.length} results`, {
        location: searchCoords,
        craving,
      });
    }
  } catch (error) {
    safeLog('warn', '[FatSecret] Location search failed, continuing...', error);
    // Fallback: Gemini-only mode
  }

  // 3c. NUEVO: Filtrar resultados de FatSecret
  let safeIngredientsContext = 'Comidas saludables cercanas a tu ubicación';
  if (fatSecretResults.length > 0) {
    const foodItems = fatSecretResults.map((f) => ({
      food_name: f.food_name,
      food_type: f.food_type,
    }));

    const filterResult = filterFatSecretResults(foodItems, user, (msg) =>
      safeLog('log', msg),
    );

    // Puntuar ingredientes filtrados
    const { priorityList, marketList } = IngredientScorer.scoreIngredients(
      filterResult.filteredFoods.map((f) => f.food_name),
      pantryItems.map((p) => p.name),
    );

    safeIngredientsContext = `${priorityList}${marketList ? ', ' + marketList : ''}`;

    safeLog('log', 'Metadata to be stored', {
      original_fatsecret: filterResult.originalCount,
      filtered: filterResult.filteredCount,
      removal_reasons: filterResult.removalReasons,
    });
  }

  // 3d. Obtener historial (igual a En casa)
  const historyManager = new RecipeHistoryManager(db);
  const previousRecipes = await historyManager.getPreviousRecipes(userId, 5);
  const { historyInstruction, forbiddenTitles } =
    await historyManager.buildHistoryContext(previousRecipes);

  // 3e. Preparar contexto
  const medicalContextOut = [
    ...ensureArray(user.diseases),
    ...ensureArray(user.allergies),
    user.otherAllergies || '',
  ]
    .filter(Boolean)
    .join(', ');

  const dislikedContextOut = [
    ...ensureArray(user.dislikedFoods),
    ...ensureArray(request.dislikedFoods),
  ]
    .filter(Boolean)
    .join(', ');

  // 3f. Obtener contexto de viaje
  const travelContext = await detectTravelContext(searchCoords, request, user);
  const budgetInstruction = getBudgetInstruction(request, travelContext);

  // 3g. Construir Prompt
  finalPrompt = PromptBuilder.buildRestaurantPrompt({
    type: 'Fuera',
    dietaryGoal: Array.isArray(user.nutritionalGoal)
      ? user.nutritionalGoal.join(', ')
      : user.nutritionalGoal || 'saludable',
    medicalContext: PromptBuilder.escapeUserInput(medicalContextOut),
    dislikedFoodsContext: PromptBuilder.escapeUserInput(dislikedContextOut),
    historyContext: historyInstruction, // NUEVO ✅
    safeIngredientsContext: safeIngredientsContext, // NUEVO ✅
    budgetInstruction,
    travelContext,
    city: user.city || 'su ubicación actual',
    mealType: (request.cravings as string) || 'Cualquiera saludable',
    language: request.language,
  });
}
*/

/*
// ============================================
// PASO 4: GUARDAR CON METADATA COMPLETA - Línea ~1200+
// ============================================

// ANTES DE GUARDAR EN FIRESTORE, AGREGAR:

const metadataToStore = {
  // Datos existentes
  usuario: user.firstName || 'Usuario',
  user_id: userId,
  user_interactions: newDoc.id,
  fecha_creacion: serverTimestamp(),
  receta: parsedData,
  markdown: formattedMarkdown,

  // NUEVO: Contexto de historial
  historial: {
    previous_recipes_count: forbiddenTitles?.length || 0,
    forbidden_titles: forbiddenTitles || [],
    is_new_recipe: !forbiddenTitles?.some((t) =>
      parsedData.recetas?.[0]?.titulo?.includes(t),
    ),
  },

  // NUEVO: Contexto de filtrado (si aplicable)
  filtrado: {
    original_count: filterResult?.originalCount || 0,
    filtered_count: filterResult?.filteredCount || 0,
    removal_reasons: filterResult?.removalReasons || {},
    filters_applied: filterResult?.filtersSummary || {},
  },

  // NUEVO: Gestión de despensa/ingredientes
  ingredientes_metadata: {
    from_pantry: stats?.fromPantry || 0,
    need_to_buy: stats?.needToBuy || 0,
    pantry_match_percentage: stats?.pantryMatchPercentage || 0,
  },

  // NUEVO: Auditoría de búsqueda FatSecret
  fatsecret_search: {
    used: !!fatSecretResults?.length,
    results_found: fatSecretResults?.length || 0,
    location: searchCoords || null,
    filters_applied: filterResult ? true : false,
  },

  // Timestamps para análisis
  timestamps: {
    generated_at: new Date().toISOString(),
    user_timezone: user.timezone || 'UTC',
  },
};

// Guardar en Firestore con metadata completa
await db.collection('user_interactions').doc(newDoc.id).update({
  metadata: metadataToStore,
});

// ============================================
// PASO 5: VALIDACIÓN ANTES DE DEVOLVER - Línea ~1300+
// ============================================

// Validar que no hay repetición
const noRepetitionCheck = await historyManager.validateNoRepetition(
  userId,
  parsedData.recetas?.map((r: any) => r.titulo) || [],
);

if (!noRepetitionCheck.valid) {
  safeLog('warn', 'WARNING: Generated recipes have repetition', {
    repeated: noRepetitionCheck.repeated,
  });
  trackEvent('recommendation_repetition_detected', {
    type,
    repeated_count: noRepetitionCheck.repeated.length,
  });
}

// Validar variedad de ingredientes (opcional)
const varietyCheck = IngredientScorer.validateIngredientsVariety(
  fatSecretResults?.map((f) => f.food_name) ||
    allIngredients?.map((i) => i.name) ||
    [],
);

if (!varietyCheck.valid) {
  safeLog('warn', 'WARNING: Ingredient variety issues detected', {
    issues: varietyCheck.issues,
    stats: varietyCheck.stats,
  });
}
*/

// ============================================
// SUMMARY
// ============================================

/*
✅ Integration checklist:

Phase 2a - RecipeHistoryManager:
  [ ] Import RecipeHistoryManager
  [ ] Create instance per request
  [ ] Call getPreviousRecipes() & buildHistoryContext()
  [ ] Pass historyInstruction to PromptBuilder
  [ ] Validate no repetition after generation

Phase 2b - IngredientScorer:
  [ ] Import IngredientScorer
  [ ] Call scoreIngredients() with filtered foods + pantry
  [ ] Use generateIngredientContext() for prompt
  [ ] Store stats in metadata

Phase 2c - FatSecret Location:
  [ ] Import searchMealByDescription() & searchFatSecretByLocation()
  [ ] Call for "Fuera" branch (when searchCoords available)
  [ ] Filter results through filterFatSecretResults()
  [ ] Score filtered results

Phase 2d - Metadata Storage:
  [ ] Build comprehensive metadataToStore object
  [ ] Include historial, filtrado, ingredientes_metadata, fatsecret_search
  [ ] Save to Firestore before returning response
  [ ] Add validation checks for quality assurance

Expected Results:
  ✅ Zero recipe repetition
  ✅ Pantry-aware recommendations
  ✅ Location-based food suggestions (Fuera)
  ✅ Complete audit trail of all filtering & transformations
  ✅ Analytics-ready metadata for future insights
*/
