import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { COUNTRY_TO_CURRENCY, CURRENCY_CONFIG } from '@/data/budgets';

// Shared Utils & Services
import {
  safeLog,
  normalizeText,
  ensureArray,
  cleanForFirestore,
  createRegexPattern
} from '@/lib/api/utils/shared-logic';
import { RecommendationDataService, UserProfile } from '@/lib/api/services/data-service';
import { PromptBuilder } from '@/lib/api/services/prompt-builder';
import { RecommendationScorer, PantryItem, FirestoreIngredient } from '@/lib/api/services/recommendation-scorer';
import { initFirebaseAdmin } from '@/lib/api/firebase-admin';
import { UserRateLimiter } from '@/lib/api/utils/user-rate-limiter';
import { filterIngredientes } from '@/lib/api/services/ingredient-filter';

import { historyCache } from '@/lib/api/utils/cache';
import { getFatSecretIngredientsWithCache } from '@/lib/api/utils/fatsecret-logic';
import { NutritionEnricher } from '@/lib/api/services/nutrition-enricher';
// Removed unused imports: filterFatSecretResults, processFatSecretResults

// Phase 2 Integration
import RecipeHistoryManager from '@/lib/api/services/recipe-history';
import IngredientScorer from '@/lib/api/services/ingredient-scorer';

// Phase 3: Airtable Integration - Master Index + FatSecret Hydration
import {
  filterIngredientsBySafety,
  hydrateIngredientsNutrition,
  getSafeIngredientsWithNutrition,
  findIngredientsByNames,
  UserDietaryProfile,
  HydratedNutrition,
  // NEW: Full enrichment flow
  enrichPantryWithNutrition,
  buildExtendedMedicalProfile,
  calculateRecipeMacros,
  EnrichedIngredient,
  ExtendedMedicalProfile,
  EnrichedPantryResult,
  isAirtableConfigured,
} from '@/lib/api/services/airtableService';

// Validation Schema - Import from middleware
import { 
  RecommendationRequestSchema, 
  type ValidatedRecommendationRequest 
} from '@/lib/api/middleware/validation-middleware';

// Location service
import { 
  getUserCoordinates, 
  formatCoordinates, 
  getCountryCodeFromCoords,
  detectLocationContext,
  type Coordinates,
  type LocationContext
} from '@/lib/api/services/location-service';

import { ALLOWED_ORIGINS_LIST, isOriginAllowed } from '@/lib/api/cors-utils';

// ============================================
// 1. INICIALIZACIÓN DE FIREBASE
// ============================================

const adminApp = initFirebaseAdmin();
const db = (adminApp ? getFirestore() : null) as any;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;


// Initialize Services
const dataService = new RecommendationDataService(db);
const userRateLimiter = new UserRateLimiter(db);

// ============================================
// 2. VALIDACIÓN CON ZOD
// ============================================

import { z } from "zod";
import { 
  TIMEOUTS, 
  RATE_LIMITS, 
  CACHE, 
  SEARCH, 
  AI_LIMITS, 
  VALIDATION_LIMITS
} from "@/config/apiConstants";

// CORS HELPER
function corsHeaders(origin: string | null) {
  const originStr = origin || undefined;
  const allowedOrigin = isOriginAllowed(originStr) ? (originStr || ALLOWED_ORIGINS_LIST[0]) : ALLOWED_ORIGINS_LIST[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Schemas para validar respuesta de Gemini
// 🔒 SECURITY: Strict validation to prevent garbage data in Firestore
const MacroSchema = z.object({
  kcal: z.number().min(0).max(VALIDATION_LIMITS.MAX_KCAL).default(0),
  proteinas_g: z.number().min(0).max(VALIDATION_LIMITS.MAX_MACROS_G).default(0),
  carbohidratos_g: z.number().min(0).max(VALIDATION_LIMITS.MAX_MACROS_G).default(0),
  grasas_g: z.number().min(0).max(VALIDATION_LIMITS.MAX_MACROS_G).default(0),
});

const RecipeSchema = z.object({
  id: z.union([z.number(), z.string()]),
  titulo: z.string().min(1).max(200),  // 🔒 min(1) prevents empty titles
  tiempo_estimado: z.string().max(50).optional(),
  dificultad: z.enum(["Fácil", "Media", "Difícil"]).optional(),
  coincidencia_despensa: z.string().max(100).optional(),
  ingredientes: z.array(z.string().min(1).max(200)).min(1).max(50),  // 🔒 At least 1 ingredient
  pasos_preparacion: z.array(z.string().min(1).max(VALIDATION_LIMITS.MAX_STEP_LENGTH)).min(1).max(VALIDATION_LIMITS.MAX_STEPS),  // 🔒 At least 1 step
  macros_por_porcion: MacroSchema.optional(),
});

const RecipeResponseSchema = z.object({
  saludo_personalizado: z.string().min(1).max(VALIDATION_LIMITS.MAX_GREETING_LENGTH),  // 🔒 min(1) prevents empty greeting
  receta: z.object({
    recetas: z.array(RecipeSchema).min(1).max(10),  // 🔒 At least 1 recipe
  }),
});

const RestaurantSchema = z.object({
  id: z.union([z.number(), z.string()]),
  nombre_restaurante: z.string().min(1).max(200),  // 🔒 min(1) prevents empty names
  tipo_comida: z.string().min(1).max(100),
  direccion_aproximada: z.string().min(1).max(500),
  plato_sugerido: z.string().min(1).max(200),
  por_que_es_bueno: z.string().min(1).max(VALIDATION_LIMITS.MAX_GREETING_LENGTH),
  hack_saludable: z.string().max(500).optional(),  // Optional, can be empty
});

const RestaurantResponseSchema = z.object({
  saludo_personalizado: z.string().min(1).max(VALIDATION_LIMITS.MAX_GREETING_LENGTH),
  ubicacion_detectada: z.string().max(200).optional(),
  recomendaciones: z.array(RestaurantSchema).min(1).max(10),  // 🔒 At least 1 recommendation
});

// ============================================
// 6. RATE LIMITING POR IP (Protección contra abuso)
// ============================================

/**
 * Rate limiter basado en IP para prevenir abuso de la API.
 * 
 * Limita las requests por IP usando ventanas deslizantes.
 * Si un IP supera el límite, es bloqueado temporalmente.
 */
class IPRateLimiter {
  private config = {
    windowMs: RATE_LIMITS.IP_WINDOW_MS,
    maxRequests: RATE_LIMITS.IP_MAX_REQUESTS,
    blockDurationMs: RATE_LIMITS.IP_BLOCK_DURATION_MS,
  };

  /**
   * Verifica si una IP puede hacer una request
   */
  async checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!db) return { allowed: true }; // FAIL-OPEN si no hay DB

    const now = Date.now();
    const docRef = db.collection("ip_rate_limits").doc(ip);

    try {
      return await db.runTransaction(async (t: any) => {
        const doc = await t.get(docRef);
        const data = doc.exists ? (doc.data() as any) : null;

        // Si está bloqueado
        if (data?.blockedUntil && data.blockedUntil > now) {
          return {
            allowed: false,
            retryAfter: Math.ceil((data.blockedUntil - now) / 1000),
          };
        }

        const requests = (data?.requests || []).filter(
          (ts: number) => now - ts < this.config.windowMs,
        );

        // Si excede el límite, bloquear
        if (requests.length >= this.config.maxRequests) {
          t.set(docRef, {
            requests: [...requests, now],
            blockedUntil: now + this.config.blockDurationMs,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return {
            allowed: false,
            retryAfter: Math.ceil(this.config.blockDurationMs / 1000),
          };
        }

        // Registrar request
        t.set(docRef, {
          requests: [...requests, now],
          blockedUntil: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return { allowed: true };
      });
    } catch (error) {
      safeLog("error", "Error en IP rate limit", error);
      // FAIL-CLOSED: Si no podemos verificar IP rate limit, rechazar por seguridad
      return {
        allowed: false,
        retryAfter: 60, // Bloquear 1 minuto como precaución
      };
    }
  }
}

const ipRateLimiter = new IPRateLimiter();

// ============================================
// 7. CONFIGURACIÓN DE BÚSQUEDA DE RESTAURANTES
// ============================================

// Rango de búsqueda en metros (8km)
const SEARCH_RADIUS_METERS = SEARCH.RADIUS_METERS;

// ============================================
// 8. AIRTABLE INTEGRATION HELPERS
// ============================================

/**
 * Convierte el perfil del usuario a formato de restricciones dietéticas de Airtable
 * Mapea diseases/allergies a flags booleanos para filtrado de seguridad clínica
 */
function userProfileToDietaryProfile(user: UserProfile): UserDietaryProfile {
  const diseases = ensureArray(user.diseases).map(d => d.toLowerCase());
  const allergies = ensureArray(user.allergies).map(a => a.toLowerCase());
  const otherAllergies = (user.otherAllergies || '').toLowerCase();
  const eatingHabit = (user.eatingHabit || '').toLowerCase();
  
  return {
    celiaco: diseases.includes('celíaco') || 
             diseases.includes('celiaco') || 
             diseases.includes('enfermedad celíaca') ||
             allergies.includes('gluten'),
    vegano: eatingHabit.includes('vegano') || eatingHabit === 'vegan',
    vegetariano: eatingHabit.includes('vegetariano') || 
                 eatingHabit.includes('vegano') || 
                 eatingHabit === 'vegetarian',
    intoleranteLactosa: diseases.includes('intolerancia a la lactosa') || 
                        allergies.includes('lactosa') ||
                        allergies.includes('lácteos') ||
                        otherAllergies.includes('lactosa'),
    alergicoFrutosSecos: allergies.includes('frutos secos') || 
                         allergies.includes('nueces') ||
                         allergies.includes('almendras') ||
                         otherAllergies.includes('frutos secos'),
  };
}

/**
 * Formatea datos nutricionales hidratados para incluir en el prompt de Gemini
 */
function formatHydratedNutrition(nutritionMap: Map<string, HydratedNutrition>): string {
  if (nutritionMap.size === 0) return '';
  
  const lines: string[] = ['### 📊 DATOS NUTRICIONALES (FatSecret v5):'];
  
  for (const [name, nutrition] of nutritionMap) {
    lines.push(`- ${name}: ${nutrition.calories}kcal, P:${nutrition.protein}g, C:${nutrition.carbohydrate}g, G:${nutrition.fat}g (por ${nutrition.servingSize}${nutrition.servingUnit})`);
  }
  
  return lines.join('\n');
}

/**
 * Genera instrucción de presupuesto con conversión de moneda si es necesario
 */
function getBudgetInstruction(
  request: ValidatedRecommendationRequest,
  context: LocationContext,
): string {
  const budgetValue = request.budget ?? "sin límite";
  const requestCurrency = request.currency ?? context.homeCurrency;

  // Si no está viajando o no hay presupuesto, devolver normal
  if (!context.isTraveling || budgetValue === "sin límite") {
    return `PRESUPUESTO: ${budgetValue} ${requestCurrency}`;
  }

  // Si está viajando, mencionar ambas monedas sin conversión específica
  return `PRESUPUESTO: ${budgetValue} ${requestCurrency} (ajustar recomendaciones a precios locales en ${context.activeCurrency})`;
}

// ============================================
// HTTP HANDLERS
// ============================================

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const originStr = origin || undefined;
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(originStr)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  // ============================================
  // GET /api/recommend?userId=xxx - Status del rate limit
  // ============================================
  
  // Auth validation
  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return NextResponse.json(
      { error: "Auth token required" },
      { status: 401, headers }
    );
  }

  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    userId = decoded.uid;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid auth token" },
      { status: 401, headers }
    );
  }

  const status = await userRateLimiter.getStatus(userId);
  if (!status) {
    return NextResponse.json({
      canRequest: true,
      requestsInWindow: 0,
      remainingRequests: 2, // Updated from constants
    }, { headers });
  }

  return NextResponse.json({
    ...status,
    nextAvailableIn: status.nextAvailableAt
      ? Math.max(0, Math.ceil((status.nextAvailableAt - Date.now()) / 1000))
      : 0,
  }, { headers });
}

export async function POST(request: NextRequest) {
  if (!adminApp || !db) {
    const origin = request.headers.get("origin");
    return NextResponse.json(
      { error: "Firebase Admin not initialized. Check your environment variables." },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  const origin = request.headers.get("origin");
  const originStr = origin || undefined;
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(originStr)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  // Auth validation
  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return NextResponse.json(
      { error: "Auth token required" },
      { status: 401, headers }
    );
  }

  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    userId = decoded.uid;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid auth token" },
      { status: 401, headers }
    );
  }

  // Parse and validate request body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers }
    );
  }

  // Validate request body using Zod
  const bodyValidation = RecommendationRequestSchema.safeParse(body);
  if (!bodyValidation.success) {
    return NextResponse.json(
      { error: bodyValidation.error.issues.map(i => i.message).join(", ") },
      { status: 400, headers }
    );
  }

  // Verify userId matches auth
  if (bodyValidation.data.userId !== userId) {
    return NextResponse.json(
      { error: "userId no coincide con el token de autenticación" },
      { status: 403, headers }
    );
  }

  const requestData = bodyValidation.data;
  let interactionRef: FirebaseFirestore.DocumentReference | null = null;

  try {
    const { type, _id } = requestData;
    const interactionId = _id || `int_${Date.now()}`;

    safeLog(
      "log",
      `🚀 Nueva solicitud: type=${type}, userId=${userId?.substring(0, 8)}...`,
    );

    interactionRef = db.collection("user_interactions").doc(interactionId);
    await interactionRef!.set({
      userId,
      interaction_id: interactionId,
      createdAt: FieldValue.serverTimestamp(),
      status: "processing",
      tipo: type,
    });

    // ⚠️ IMPLEMENTACIÓN PENDIENTE
    // Este endpoint valida auth y body correctamente pero aún no ejecuta
    // la lógica de recomendación. Ver implementación completa en:
    // src/lib/api/services/ (data-service, prompt-builder, recommendation-scorer)
    // No deployar a producción hasta completar la integración.
    // TODO: Add the complete recommendation logic here
    // For now, return a basic success response to test the structure
    return NextResponse.json({
      success: true,
      message: "Recommendation endpoint converted to App Router - implementation in progress",
      type: type,
      interactionId: interactionId
    }, { headers });

  } catch (error: any) {
    safeLog("error", "Error in POST /api/recommend", error);
    
    // Update interaction status if we have a reference
    if (interactionRef) {
      try {
        await interactionRef.update({
          status: "error",
          error: error.message,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        safeLog("error", "Failed to update interaction status", updateError);
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// Import ValidatedRecommendationRequest type from middleware

// 🔒 TYPES: Ingredient interfaces to replace 'any'
interface FilteredIngredient {
  name: string;
  food_name?: string;
  food_id?: string;
  airtableId?: string;
}

// Renamed to avoid conflict with imported PantryItem from recommendation-scorer
interface LocalPantryItem {
  name: string;
  food_name?: string;
  airtableId?: string;
  quantity?: number;
  unit?: string;
}

interface PantryItemForEnrichment {
  name: string;
  airtableId?: string;
  quantity?: number;
  unit?: string;
}

// ============================================
// TIMEOUT HELPER - Prevents hanging on slow external APIs
// ============================================
/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified time, it rejects with a timeout error.
 * 
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param operationName Name for logging purposes
 * @returns The resolved value or throws on timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}