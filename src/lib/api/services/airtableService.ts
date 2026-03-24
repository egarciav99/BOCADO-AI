/**
 * Airtable Service - Índice Maestro de Ingredientes
 * 
 * Este servicio conecta con Airtable como fuente de identidad para:
 * - 1,076 ingredientes mapeados con FatSecret_ID
 * - Flags de seguridad clínica (Celíaco, Vegano, etc.)
 * - Hidratación en tiempo real con FatSecret v5
 */

import Airtable from 'airtable';
import NodeCache from 'node-cache';
import { getFatSecretFood } from '../utils/fatsecret';

// Environment variables
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Ingredientes';

// Check if Airtable is configured
const AIRTABLE_CONFIGURED = !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID);

// Initialize Airtable only if configured
if (AIRTABLE_CONFIGURED) {
  Airtable.configure({
    apiKey: AIRTABLE_API_KEY,
  });
}

const base = AIRTABLE_CONFIGURED ? Airtable.base(AIRTABLE_BASE_ID) : null;

// Cache: 24h para cumplir ToS de FatSecret (no almacenar macros más de 24h)
const ingredientCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });
const nutritionCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

/**
 * Verifica si Airtable está configurado correctamente
 */
export function isAirtableConfigured(): boolean {
  return AIRTABLE_CONFIGURED;
}

/**
 * Interfaz para un ingrediente del Índice Maestro
 */
export interface MasterIngredient {
  id: string;                    // Airtable Record ID
  nombre: string;                // Nombre del ingrediente
  fatSecretId: string | null;    // FatSecret food_id para hidratación
  // Flags de seguridad clínica
  celiaco: boolean;              // ¿Seguro para celíacos?
  vegano: boolean;               // ¿Es vegano?
  vegetariano: boolean;          // ¿Es vegetariano?
  intolerancieLactosa: boolean;  // ¿Seguro para intolerancia a lactosa?
  alergiaFrutosSecos: boolean;   // ¿Contiene frutos secos?
  // Metadatos opcionales
  categoria?: string;
  subcategoria?: string;
  unidadMedida?: string;
}

/**
 * Interfaz para datos nutricionales hidratados de FatSecret
 */
export interface HydratedNutrition {
  foodId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  servingDescription: string;
  servingSize: number;
  servingUnit: string;
  hydratedAt: number; // timestamp
}

/**
 * Obtiene todos los ingredientes del Índice Maestro
 * Con caché de 24h para optimización
 * Retorna array vacío si Airtable no está configurado (graceful degradation)
 */
export async function getAllIngredients(): Promise<MasterIngredient[]> {
  // Graceful degradation: si Airtable no está configurado, retornar vacío
  if (!AIRTABLE_CONFIGURED || !base) {
    console.warn('[Airtable] ⚠️ Not configured, returning empty ingredients list');
    return [];
  }

  const cacheKey = 'all_ingredients';
  const cached = ingredientCache.get<MasterIngredient[]>(cacheKey);
  
  if (cached) {
    console.log('[Airtable] Using cached ingredients list');
    return cached;
  }

  console.log('[Airtable] Fetching all ingredients from master index...');
  const startTime = Date.now();
  
  try {
    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        view: 'Grid view', // Ajustar según tu vista en Airtable
      })
      .all();

    const ingredients: MasterIngredient[] = records.map((record) => ({
      id: record.id,
      nombre: (record.get('Nombre') as string) || '',
      fatSecretId: (record.get('FatSecret_ID') as string) || null,
      celiaco: (record.get('Celíaco') as boolean) ?? true,
      vegano: (record.get('Vegano') as boolean) ?? false,
      vegetariano: (record.get('Vegetariano') as boolean) ?? false,
      intolerancieLactosa: (record.get('Intolerancia_lactosa') as boolean) ?? true,
      alergiaFrutosSecos: record.get('Alergia_frutos_secos') ? false : true,
      categoria: record.get('Categoria') as string | undefined,
      subcategoria: record.get('Subcategoria') as string | undefined,
      unidadMedida: record.get('Unidad_medida') as string | undefined,
    }));

    ingredientCache.set(cacheKey, ingredients);
    const duration = Date.now() - startTime;
    console.log(`[Airtable] Fetched ${ingredients.length} ingredients in ${duration}ms`);
    
    return ingredients;
  } catch (error) {
    console.error('[Airtable] Error fetching ingredients:', error);
    // Graceful degradation: retornar vacío en lugar de fallar
    console.warn('[Airtable] ⚠️ Falling back to empty ingredients list');
    return [];
  }
}

/**
 * Busca un ingrediente por nombre en el Índice Maestro
 */
export async function findIngredientByName(name: string): Promise<MasterIngredient | null> {
  const ingredients = await getAllIngredients();
  const normalizedName = name.toLowerCase().trim();
  
  return ingredients.find(
    (ing) => ing.nombre.toLowerCase() === normalizedName
  ) || null;
}

/**
 * Busca múltiples ingredientes por nombre
 * Retorna un mapa de nombre -> ingrediente para búsqueda eficiente
 */
export async function findIngredientsByNames(names: string[]): Promise<Map<string, MasterIngredient>> {
  const ingredients = await getAllIngredients();
  const result = new Map<string, MasterIngredient>();
  
  const ingredientMap = new Map(
    ingredients.map((ing) => [ing.nombre.toLowerCase(), ing])
  );
  
  for (const name of names) {
    const normalized = name.toLowerCase().trim();
    const found = ingredientMap.get(normalized);
    if (found) {
      result.set(name, found);
    }
  }
  
  return result;
}

/**
 * Obtiene el FatSecret_ID para un ingrediente
 */
export async function getFatSecretIdForIngredient(ingredientName: string): Promise<string | null> {
  const ingredient = await findIngredientByName(ingredientName);
  return ingredient?.fatSecretId || null;
}

/**
 * Hidrata un ingrediente con datos nutricionales de FatSecret v5
 * Cumple con ToS: datos frescos en cada sesión de recomendación
 */
export async function hydrateIngredientNutrition(
  ingredientName: string,
  region = 'MX',
  language = 'es'
): Promise<HydratedNutrition | null> {
  // Buscar en caché de sesión primero
  const cacheKey = `nutrition_${ingredientName}_${region}_${language}`;
  const cached = nutritionCache.get<HydratedNutrition>(cacheKey);
  
  if (cached) {
    console.log(`[Airtable] Using cached nutrition for "${ingredientName}"`);
    return cached;
  }

  // Obtener FatSecret_ID del Índice Maestro
  const fatSecretId = await getFatSecretIdForIngredient(ingredientName);
  
  if (!fatSecretId) {
    console.warn(`[Airtable] No FatSecret_ID found for "${ingredientName}"`);
    return null;
  }

  console.log(`[Airtable] Hydrating "${ingredientName}" (FatSecret ID: ${fatSecretId})`);
  
  try {
    // Llamar a FatSecret API v5 para datos frescos
    const foodData = await getFatSecretFood(fatSecretId, region, language);
    
    if (!foodData || !foodData.food) {
      console.warn(`[Airtable] No food data returned for "${ingredientName}"`);
      return null;
    }

    const food = foodData.food;
    const serving = Array.isArray(food.servings?.serving) 
      ? food.servings.serving[0] 
      : food.servings?.serving;

    if (!serving) {
      console.warn(`[Airtable] No serving data for "${ingredientName}"`);
      return null;
    }

    const nutrition: HydratedNutrition = {
      foodId: fatSecretId,
      foodName: food.food_name || ingredientName,
      calories: parseFloat(serving.calories) || 0,
      protein: parseFloat(serving.protein) || 0,
      carbohydrate: parseFloat(serving.carbohydrate) || 0,
      fat: parseFloat(serving.fat) || 0,
      fiber: serving.fiber ? parseFloat(serving.fiber) : undefined,
      sodium: serving.sodium ? parseFloat(serving.sodium) : undefined,
      sugar: serving.sugar ? parseFloat(serving.sugar) : undefined,
      servingDescription: serving.serving_description || '',
      servingSize: parseFloat(serving.metric_serving_amount) || 100,
      servingUnit: serving.metric_serving_unit || 'g',
      hydratedAt: Date.now(),
    };

    // Cachear para la sesión (evita llamadas redundantes)
    nutritionCache.set(cacheKey, nutrition);
    
    return nutrition;
  } catch (error) {
    console.error(`[Airtable] Error hydrating "${ingredientName}":`, error);
    return null;
  }
}

/**
 * Hidrata múltiples ingredientes en batch
 * Optimizado para reducir llamadas a FatSecret
 */
export async function hydrateIngredientsNutrition(
  ingredientNames: string[],
  region = 'MX',
  language = 'es'
): Promise<Map<string, HydratedNutrition>> {
  console.log(`[Airtable] Batch hydrating ${ingredientNames.length} ingredients...`);
  const startTime = Date.now();
  
  const results = new Map<string, HydratedNutrition>();
  
  // Procesar en paralelo con límite de concurrencia
  const BATCH_SIZE = 5; // Evitar rate limiting de FatSecret
  
  for (let i = 0; i < ingredientNames.length; i += BATCH_SIZE) {
    const batch = ingredientNames.slice(i, i + BATCH_SIZE);
    const promises = batch.map((name) => 
      hydrateIngredientNutrition(name, region, language)
        .then((nutrition) => ({ name, nutrition }))
    );
    
    const batchResults = await Promise.all(promises);
    
    for (const { name, nutrition } of batchResults) {
      if (nutrition) {
        results.set(name, nutrition);
      }
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[Airtable] Batch hydration complete: ${results.size}/${ingredientNames.length} in ${duration}ms`);
  
  return results;
}

/**
 * Perfil de restricciones del usuario
 */
export interface UserDietaryProfile {
  celiaco: boolean;
  vegano: boolean;
  vegetariano: boolean;
  intoleranteLactosa: boolean;
  alergicoFrutosSecos: boolean;
}

/**
 * Filtra ingredientes según el perfil dietético del usuario
 * SEGURIDAD CLÍNICA: Cruza los flags de Airtable con las restricciones del usuario
 */
export async function filterIngredientsBySafety(
  ingredientNames: string[],
  userProfile: UserDietaryProfile
): Promise<{ safe: string[]; unsafe: string[]; unknown: string[] }> {
  console.log(`[Airtable] Filtering ${ingredientNames.length} ingredients for safety...`);
  
  const ingredientMap = await findIngredientsByNames(ingredientNames);
  
  const safe: string[] = [];
  const unsafe: string[] = [];
  const unknown: string[] = [];
  
  for (const name of ingredientNames) {
    const ingredient = ingredientMap.get(name);
    
    if (!ingredient) {
      unknown.push(name);
      continue;
    }
    
    // Verificar cada restricción del usuario
    let isSafe = true;
    
    if (userProfile.celiaco && !ingredient.celiaco) {
      isSafe = false;
      console.log(`[Airtable] ❌ "${name}" unsafe for celiac`);
    }
    
    if (userProfile.vegano && !ingredient.vegano) {
      isSafe = false;
      console.log(`[Airtable] ❌ "${name}" not vegan`);
    }
    
    if (userProfile.vegetariano && !ingredient.vegetariano) {
      isSafe = false;
      console.log(`[Airtable] ❌ "${name}" not vegetarian`);
    }
    
    if (userProfile.intoleranteLactosa && !ingredient.intolerancieLactosa) {
      isSafe = false;
      console.log(`[Airtable] ❌ "${name}" contains lactose`);
    }
    
    if (userProfile.alergicoFrutosSecos && !ingredient.alergiaFrutosSecos) {
      isSafe = false;
      console.log(`[Airtable] ❌ "${name}" contains nuts`);
    }
    
    if (isSafe) {
      safe.push(name);
    } else {
      unsafe.push(name);
    }
  }
  
  console.log(`[Airtable] Safety filter result: ${safe.length} safe, ${unsafe.length} unsafe, ${unknown.length} unknown`);
  
  return { safe, unsafe, unknown };
}

/**
 * Obtiene ingredientes seguros para una receta específica
 * Combina filtrado de seguridad + hidratación nutricional
 */
export async function getSafeIngredientsWithNutrition(
  ingredientNames: string[],
  userProfile: UserDietaryProfile,
  region = 'MX',
  language = 'es'
): Promise<{
  ingredients: Array<{
    name: string;
    nutrition: HydratedNutrition | null;
  }>;
  filtered: string[];
  unknown: string[];
}> {
  // Paso 1: Filtrar por seguridad
  const { safe, unsafe, unknown } = await filterIngredientsBySafety(ingredientNames, userProfile);
  
  // Paso 2: Hidratar solo los ingredientes seguros
  const nutritionMap = await hydrateIngredientsNutrition(safe, region, language);
  
  const ingredients = safe.map((name) => ({
    name,
    nutrition: nutritionMap.get(name) || null,
  }));
  
  return {
    ingredients,
    filtered: unsafe,
    unknown,
  };
}

/**
 * Diagnóstico de conexión con Airtable
 */
export async function checkAirtableConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  recordCount: number;
  errors: string[];
}> {
  const diagnostics = {
    configured: !!AIRTABLE_API_KEY && !!AIRTABLE_BASE_ID,
    connected: false,
    recordCount: 0,
    errors: [] as string[],
  };

  if (!diagnostics.configured) {
    diagnostics.errors.push('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
    return diagnostics;
  }

  if (!base) {
    diagnostics.errors.push('Airtable base not initialized');
    return diagnostics;
  }

  try {
    const records = await base(AIRTABLE_TABLE_NAME)
      .select({ maxRecords: 1 })
      .firstPage();
    
    diagnostics.connected = true;
    
    // Obtener conteo total
    const allRecords = await base(AIRTABLE_TABLE_NAME).select().all();
    diagnostics.recordCount = allRecords.length;
    
    console.log(`[Airtable] ✅ Connected. ${diagnostics.recordCount} ingredients in master index.`);
  } catch (error: any) {
    diagnostics.errors.push(`Connection failed: ${error.message}`);
    console.error('[Airtable] ❌ Connection failed:', error);
  }

  return diagnostics;
}

/**
 * Limpia la caché (útil para testing o refresh forzado)
 */
export function clearCache(): void {
  ingredientCache.flushAll();
  nutritionCache.flushAll();
  console.log('[Airtable] Cache cleared');
}

// ============================================
// PHASE 3: FLUJO COMPLETO DE ENRIQUECIMIENTO
// ============================================

/**
 * Perfil médico extendido del usuario (incluye condiciones como Diabetes, Hipertensión)
 */
export interface ExtendedMedicalProfile extends UserDietaryProfile {
  diabetes: boolean;
  hipertension: boolean;
  enfermedadRenal: boolean;
  // Metas nutricionales específicas
  lowSodium: boolean;      // Para hipertensión
  lowSugar: boolean;       // Para diabetes
  lowPotassium: boolean;   // Para enfermedad renal
}

/**
 * Ingrediente enriquecido con todos los datos necesarios para el prompt
 */
export interface EnrichedIngredient {
  nombre: string;
  airtableId: string | null;
  fatSecretId: string | null;
  // Datos nutricionales hidratados (por 100g)
  nutricion: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    fibra: number;
    sodio: number;      // mg - crítico para hipertensión
    azucar: number;     // g - crítico para diabetes
    potasio?: number;   // mg - crítico para enfermedad renal
  } | null;
  // Validación médica
  esSeguro: boolean;
  razonInseguro?: string;
  // Contexto para el prompt
  aptoPara: string[];   // ["Hipertensión", "Diabetes", etc.]
  servingInfo: string;  // "por 100g"
}

/**
 * Resultado del enriquecimiento completo de despensa
 */
export interface EnrichedPantryResult {
  ingredientesEnriquecidos: EnrichedIngredient[];
  ingredientesFiltrados: Array<{ nombre: string; razon: string }>;
  ingredientesDesconocidos: string[];
  resumenNutricional: {
    totalIngredientes: number;
    conDatosNutricionales: number;
    filtradosPorSeguridad: number;
  };
  promptContext: string;  // Contexto formateado para Gemini
}

/**
 * Convierte perfil de usuario de Firestore a perfil médico extendido
 */
export function buildExtendedMedicalProfile(
  diseases: string[],
  allergies: string[],
  otherAllergies: string,
  eatingHabit: string
): ExtendedMedicalProfile {
  const diseasesLower = diseases.map(d => d.toLowerCase());
  const allergiesLower = allergies.map(a => a.toLowerCase());
  const otherLower = otherAllergies.toLowerCase();
  const habitLower = eatingHabit.toLowerCase();

  return {
    // Restricciones dietéticas básicas
    celiaco: diseasesLower.some(d => d.includes('celíaco') || d.includes('celiaco')) ||
             allergiesLower.includes('gluten'),
    vegano: habitLower.includes('vegano') || habitLower === 'vegan',
    vegetariano: habitLower.includes('vegetariano') || habitLower.includes('vegano'),
    intoleranteLactosa: diseasesLower.some(d => d.includes('lactosa')) ||
                        allergiesLower.some(a => a.includes('lactosa') || a.includes('lácteos')),
    alergicoFrutosSecos: allergiesLower.some(a => 
      a.includes('frutos secos') || a.includes('nueces') || a.includes('almendras')
    ) || otherLower.includes('frutos secos'),
    
    // Condiciones médicas
    diabetes: diseasesLower.some(d => d.includes('diabetes')),
    hipertension: diseasesLower.some(d => d.includes('hipertensión') || d.includes('hipertension')),
    enfermedadRenal: diseasesLower.some(d => 
      d.includes('renal') || d.includes('riñón') || d.includes('riñones')
    ),
    
    // Metas nutricionales derivadas
    lowSodium: diseasesLower.some(d => d.includes('hipertensión') || d.includes('hipertension')),
    lowSugar: diseasesLower.some(d => d.includes('diabetes')),
    lowPotassium: diseasesLower.some(d => d.includes('renal')),
  };
}

/**
 * Valida si un ingrediente es seguro según el perfil médico extendido
 * Retorna razón específica si no es seguro
 */
function validateIngredientSafety(
  ingredient: MasterIngredient,
  nutrition: HydratedNutrition | null,
  profile: ExtendedMedicalProfile
): { safe: boolean; reason?: string; aptoPara: string[] } {
  const aptoPara: string[] = [];
  
  // Validar restricciones dietéticas (flags de Airtable)
  if (profile.celiaco && !ingredient.celiaco) {
    return { safe: false, reason: 'Contiene gluten (no apto para celíacos)', aptoPara };
  }
  
  if (profile.vegano && !ingredient.vegano) {
    return { safe: false, reason: 'No es vegano', aptoPara };
  }
  
  if (profile.vegetariano && !ingredient.vegetariano) {
    return { safe: false, reason: 'No es vegetariano', aptoPara };
  }
  
  if (profile.intoleranteLactosa && !ingredient.intolerancieLactosa) {
    return { safe: false, reason: 'Contiene lactosa', aptoPara };
  }
  
  if (profile.alergicoFrutosSecos && !ingredient.alergiaFrutosSecos) {
    return { safe: false, reason: 'Contiene frutos secos', aptoPara };
  }
  
  // Validar condiciones médicas usando datos nutricionales
  if (nutrition) {
    // Hipertensión: limitar sodio (> 400mg/100g es alto)
    if (profile.hipertension && nutrition.sodium && nutrition.sodium > 400) {
      return { safe: false, reason: `Alto en sodio (${nutrition.sodium}mg/100g) - no recomendado para hipertensión`, aptoPara };
    }
    
    // Diabetes: limitar azúcar (> 15g/100g es alto)
    if (profile.diabetes && nutrition.sugar && nutrition.sugar > 15) {
      return { safe: false, reason: `Alto en azúcar (${nutrition.sugar}g/100g) - no recomendado para diabetes`, aptoPara };
    }
  }
  
  // Construir lista de "apto para"
  if (ingredient.celiaco) aptoPara.push('Celíacos');
  if (ingredient.vegano) aptoPara.push('Veganos');
  if (ingredient.vegetariano) aptoPara.push('Vegetarianos');
  if (ingredient.intolerancieLactosa) aptoPara.push('Intolerancia Lactosa');
  
  if (nutrition) {
    if (!nutrition.sodium || nutrition.sodium < 140) aptoPara.push('Hipertensión');
    if (!nutrition.sugar || nutrition.sugar < 5) aptoPara.push('Diabetes');
  }
  
  return { safe: true, aptoPara };
}

/**
 * 🚀 FUNCIÓN PRINCIPAL: Enriquece la despensa del usuario con datos de Airtable + FatSecret
 * 
 * Flujo completo:
 * 1. Recibe ingredientes de despensa (con o sin airtableId)
 * 2. Cruza con Índice Maestro de Airtable
 * 3. Valida restricciones médicas
 * 4. Hidrata datos nutricionales de FatSecret v5
 * 5. Genera contexto formateado para Gemini
 * 
 * GRACEFUL DEGRADATION: Si Airtable no está configurado, retorna todos los ingredientes como "unknown"
 */
export async function enrichPantryWithNutrition(
  pantryItems: Array<{ name: string; airtableId?: string; quantity?: number; unit?: string }>,
  medicalProfile: ExtendedMedicalProfile,
  region = 'MX',
  language = 'es'
): Promise<EnrichedPantryResult> {
  console.log(`[Airtable] 🚀 Enriching ${pantryItems.length} pantry items...`);
  const startTime = Date.now();

  const enrichedIngredients: EnrichedIngredient[] = [];
  const filteredIngredients: Array<{ nombre: string; razon: string }> = [];
  const unknownIngredients: string[] = [];

  // 1. Cargar todos los ingredientes del Índice Maestro
  const masterIndex = await getAllIngredients();
  
  // GRACEFUL DEGRADATION: Si no hay índice maestro (Airtable no configurado),
  // retornar resultado vacío con prompt context básico
  if (masterIndex.length === 0) {
    console.warn('[Airtable] ⚠️ No master index available, returning basic result');
    const basicPromptContext = `### 🥗 INGREDIENTES DISPONIBLES:\n${pantryItems.map(p => `- ${p.name}`).join('\n')}\n\n⚠️ Datos nutricionales no disponibles (Airtable no configurado)`;
    
    return {
      ingredientesEnriquecidos: [],
      ingredientesFiltrados: [],
      ingredientesDesconocidos: pantryItems.map(p => p.name),
      resumenNutricional: {
        totalIngredientes: pantryItems.length,
        conDatosNutricionales: 0,
        filtradosPorSeguridad: 0,
      },
      promptContext: basicPromptContext,
    };
  }

  const masterMap = new Map(masterIndex.map(ing => [ing.nombre.toLowerCase(), ing]));

  // 2. Procesar cada ingrediente de la despensa
  for (const item of pantryItems) {
    const itemName = item.name.toLowerCase().trim();
    
    // Buscar en Índice Maestro
    let masterIngredient = masterMap.get(itemName);
    
    // Si no se encuentra exacto, buscar parcial
    if (!masterIngredient) {
      for (const [key, value] of masterMap) {
        if (key.includes(itemName) || itemName.includes(key)) {
          masterIngredient = value;
          break;
        }
      }
    }

    if (!masterIngredient) {
      unknownIngredients.push(item.name);
      continue;
    }

    // 3. Hidratar datos nutricionales de FatSecret
    let nutrition: HydratedNutrition | null = null;
    if (masterIngredient.fatSecretId) {
      try {
        nutrition = await hydrateIngredientNutrition(masterIngredient.nombre, region, language);
      } catch (e) {
        console.warn(`[Airtable] Could not hydrate ${item.name}:`, e);
      }
    }

    // 4. Validar seguridad médica
    const safetyCheck = validateIngredientSafety(masterIngredient, nutrition, medicalProfile);

    if (!safetyCheck.safe) {
      filteredIngredients.push({
        nombre: item.name,
        razon: safetyCheck.reason || 'Restricción médica',
      });
      continue;
    }

    // 5. Construir ingrediente enriquecido
    const enriched: EnrichedIngredient = {
      nombre: item.name,
      airtableId: masterIngredient.id,
      fatSecretId: masterIngredient.fatSecretId,
      nutricion: nutrition ? {
        calorias: nutrition.calories,
        proteinas: nutrition.protein,
        carbohidratos: nutrition.carbohydrate,
        grasas: nutrition.fat,
        fibra: nutrition.fiber || 0,
        sodio: nutrition.sodium || 0,
        azucar: nutrition.sugar || 0,
        potasio: undefined, // FatSecret no siempre tiene potasio
      } : null,
      esSeguro: true,
      aptoPara: safetyCheck.aptoPara,
      servingInfo: nutrition ? `por ${nutrition.servingSize}${nutrition.servingUnit}` : 'por 100g',
    };

    enrichedIngredients.push(enriched);
  }

  // 6. Generar contexto formateado para Gemini
  const promptContext = generateEnrichedPromptContext(
    enrichedIngredients,
    filteredIngredients,
    medicalProfile
  );

  const duration = Date.now() - startTime;
  console.log(`[Airtable] ✅ Enrichment complete in ${duration}ms: ${enrichedIngredients.length} enriched, ${filteredIngredients.length} filtered, ${unknownIngredients.length} unknown`);

  return {
    ingredientesEnriquecidos: enrichedIngredients,
    ingredientesFiltrados: filteredIngredients,
    ingredientesDesconocidos: unknownIngredients,
    resumenNutricional: {
      totalIngredientes: pantryItems.length,
      conDatosNutricionales: enrichedIngredients.filter(i => i.nutricion).length,
      filtradosPorSeguridad: filteredIngredients.length,
    },
    promptContext,
  };
}

/**
 * Genera el contexto de prompt enriquecido para Gemini
 * Formato: "Pechuga de Pollo (ID: 9695197): 23g proteína, 50mg sodio/100g. Apto para Hipertensión."
 */
function generateEnrichedPromptContext(
  ingredients: EnrichedIngredient[],
  filtered: Array<{ nombre: string; razon: string }>,
  profile: ExtendedMedicalProfile
): string {
  const lines: string[] = [];
  
  // Header con perfil médico
  const conditions: string[] = [];
  if (profile.diabetes) conditions.push('Diabetes');
  if (profile.hipertension) conditions.push('Hipertensión');
  if (profile.celiaco) conditions.push('Celíaco');
  if (profile.vegano) conditions.push('Vegano');
  if (profile.vegetariano && !profile.vegano) conditions.push('Vegetariano');
  if (profile.intoleranteLactosa) conditions.push('Intolerancia Lactosa');
  if (profile.enfermedadRenal) conditions.push('Enfermedad Renal');
  
  if (conditions.length > 0) {
    lines.push(`### 🏥 PERFIL MÉDICO DEL USUARIO: ${conditions.join(', ')}`);
    lines.push('');
  }

  // Ingredientes enriquecidos con datos nutricionales
  lines.push('### 🥗 INGREDIENTES DISPONIBLES (DESPENSA) CON DATOS NUTRICIONALES:');
  lines.push('');
  
  for (const ing of ingredients) {
    if (ing.nutricion) {
      const n = ing.nutricion;
      let line = `- **${ing.nombre}** (ID: ${ing.fatSecretId || 'N/A'}): `;
      line += `${n.calorias}kcal, P:${n.proteinas}g, C:${n.carbohidratos}g, G:${n.grasas}g`;
      
      // Agregar sodio si el usuario tiene hipertensión
      if (profile.hipertension) {
        line += `, Sodio:${n.sodio}mg`;
      }
      
      // Agregar azúcar si el usuario tiene diabetes
      if (profile.diabetes) {
        line += `, Azúcar:${n.azucar}g`;
      }
      
      line += ` (${ing.servingInfo})`;
      
      if (ing.aptoPara.length > 0) {
        line += ` ✅ Apto: ${ing.aptoPara.join(', ')}`;
      }
      
      lines.push(line);
    } else {
      lines.push(`- **${ing.nombre}**: Sin datos nutricionales disponibles`);
    }
  }
  
  // Ingredientes filtrados (importante que Gemini NO los use)
  if (filtered.length > 0) {
    lines.push('');
    lines.push('### ⛔ INGREDIENTES PROHIBIDOS (FILTRADOS POR SEGURIDAD CLÍNICA):');
    lines.push('**NO USAR BAJO NINGUNA CIRCUNSTANCIA:**');
    for (const f of filtered) {
      lines.push(`- ❌ ${f.nombre}: ${f.razon}`);
    }
  }

  // Instrucciones especiales según perfil
  lines.push('');
  lines.push('### 📋 INSTRUCCIONES NUTRICIONALES OBLIGATORIAS:');
  
  if (profile.hipertension) {
    lines.push('- 🩺 HIPERTENSIÓN: Limitar sodio total de la receta a <600mg. Priorizar ingredientes con bajo sodio.');
  }
  
  if (profile.diabetes) {
    lines.push('- 🩺 DIABETES: Limitar azúcares a <10g por porción. Evitar carbohidratos simples.');
  }
  
  if (profile.enfermedadRenal) {
    lines.push('- 🩺 ENFERMEDAD RENAL: Limitar potasio y fósforo. Evitar legumbres y lácteos en exceso.');
  }
  
  lines.push('- 📊 USA los datos nutricionales proporcionados para calcular macros EXACTOS de cada receta.');
  lines.push('- 🔢 Incluye el desglose nutricional por porción en la respuesta.');

  return lines.join('\n');
}

/**
 * Calcula los macros totales de una receta basándose en los ingredientes usados
 * Post-procesamiento después de que Gemini genera la receta
 */
export interface RecipeMacros {
  caloriasTotales: number;
  proteinasTotales: number;
  carbohidratosTotales: number;
  grasasTotales: number;
  fibraTotales: number;
  sodioTotal: number;
  azucarTotal: number;
  porPorcion: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    sodio: number;
  };
}

export async function calculateRecipeMacros(
  ingredientesUsados: Array<{ nombre: string; cantidad: number; unidad: string }>,
  porciones: number,
  enrichedIngredients: EnrichedIngredient[]
): Promise<RecipeMacros> {
  const enrichedMap = new Map(
    enrichedIngredients.map(i => [i.nombre.toLowerCase(), i])
  );

  let totals = {
    calorias: 0,
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0,
    fibra: 0,
    sodio: 0,
    azucar: 0,
  };

  for (const ing of ingredientesUsados) {
    const enriched = enrichedMap.get(ing.nombre.toLowerCase());
    if (!enriched?.nutricion) continue;

    // Convertir cantidad a gramos (simplificado)
    let gramos = ing.cantidad;
    const unidadLower = ing.unidad.toLowerCase();
    if (unidadLower.includes('kg')) gramos *= 1000;
    if (unidadLower.includes('ml')) gramos *= 1; // Aproximación
    if (unidadLower.includes('taza')) gramos *= 240;
    if (unidadLower.includes('cucharada')) gramos *= 15;
    if (unidadLower.includes('cucharadita')) gramos *= 5;

    // Calcular proporcional (datos son por 100g)
    const factor = gramos / 100;
    const n = enriched.nutricion;

    totals.calorias += n.calorias * factor;
    totals.proteinas += n.proteinas * factor;
    totals.carbohidratos += n.carbohidratos * factor;
    totals.grasas += n.grasas * factor;
    totals.fibra += n.fibra * factor;
    totals.sodio += n.sodio * factor;
    totals.azucar += n.azucar * factor;
  }

  return {
    caloriasTotales: Math.round(totals.calorias),
    proteinasTotales: Math.round(totals.proteinas * 10) / 10,
    carbohidratosTotales: Math.round(totals.carbohidratos * 10) / 10,
    grasasTotales: Math.round(totals.grasas * 10) / 10,
    fibraTotales: Math.round(totals.fibra * 10) / 10,
    sodioTotal: Math.round(totals.sodio),
    azucarTotal: Math.round(totals.azucar * 10) / 10,
    porPorcion: {
      calorias: Math.round(totals.calorias / porciones),
      proteinas: Math.round((totals.proteinas / porciones) * 10) / 10,
      carbohidratos: Math.round((totals.carbohidratos / porciones) * 10) / 10,
      grasas: Math.round((totals.grasas / porciones) * 10) / 10,
      sodio: Math.round(totals.sodio / porciones),
    },
  };
}
