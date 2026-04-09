import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { z } from 'zod';

// Project utilities following architecture rules
import { initFirebaseAdmin } from '@/lib/api/firebase-admin';
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from '@/lib/api/cors-utils';
import { UserRateLimiter } from '@/lib/api/utils/user-rate-limiter';
import { TIMEOUTS, AI_LIMITS, VALIDATION_LIMITS } from '@/config/apiConstants';

// Initialize Firebase Admin at module level (singleton)
const adminApp = initFirebaseAdmin();
const auth = adminApp ? getAdminAuth() : null;
const db = adminApp ? getFirestore() : null;

// Request validation schema with _id optional field
const RequestBodySchema = z.object({
  userId: z.string().min(1).max(128),
  type: z.enum(["En casa", "Fuera"]),
  _id: z.string().optional(), // Optional interaction ID
  cravings: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  dislikedFoods: z.array(z.string()).optional(),
  cookingTime: z
    .union([
      z.string().regex(/^\d+$/, "Cooking time debe ser un número válido"),
      z.number().int().min(1).max(180),
    ])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(num) ? null : num;
    }),
  budget: z.string().max(50).optional().nullable(),
  mealType: z.string().max(50).optional().nullable(),
  onlyPantryIngredients: z.boolean().optional().default(false),
  ingredientes: z.array(z.string()).optional().default([]),
  currency: z.string().max(10).optional().nullable(),
  userLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  language: z.enum(["es", "en"]).default("es")
});

// Response validation schemas matching backup exactly
const MacroSchema = z.object({
  kcal: z.number().max(VALIDATION_LIMITS.MAX_KCAL).default(0),
  proteinas_g: z.number().max(VALIDATION_LIMITS.MAX_MACROS_G).default(0),
  carbohidratos_g: z.number().max(VALIDATION_LIMITS.MAX_MACROS_G).default(0),
  grasas_g: z.number().max(VALIDATION_LIMITS.MAX_MACROS_G).default(0),
});

const RecipeSchema = z.object({
  id: z.union([z.number(), z.string()]),
  titulo: z.string().max(200),
  tiempo_estimado: z.string().max(50).optional(),
  dificultad: z.enum(["Fácil", "Media", "Difícil"]).optional(),
  coincidencia_despensa: z.string().max(500).optional(),
  ingredientes: z.array(z.string().max(200)).max(50),
  pasos_preparacion: z.array(z.string().max(VALIDATION_LIMITS.MAX_STEP_LENGTH)).max(VALIDATION_LIMITS.MAX_STEPS),
  macros_por_porcion: MacroSchema.optional(),
});

const RecipeResponseSchema = z.object({
  saludo_personalizado: z.string().max(VALIDATION_LIMITS.MAX_GREETING_LENGTH),
  receta: z.object({
    recetas: z.array(RecipeSchema).max(10),
  }),
});

const RestaurantSchema = z.object({
  id: z.union([z.number(), z.string()]),
  nombre_restaurante: z.string().max(200),
  tipo_comida: z.string().max(100),
  direccion_aproximada: z.string().max(500),
  plato_sugerido: z.string().max(200),
  por_que_es_bueno: z.string().max(1000),
  hack_saludable: z.string().max(500),
});

const RestaurantResponseSchema = z.object({
  saludo_personalizado: z.string().max(VALIDATION_LIMITS.MAX_GREETING_LENGTH),
  ubicacion_detectada: z.string().max(200).optional(),
  recomendaciones: z.array(RestaurantSchema).max(10),
});

// User profile interface
interface UserProfile {
  userId: string;
  eatingHabit?: string;
  age?: number | string;
  sex?: string;
  gender?: string;
  weight?: string;
  height?: string;
  activityLevel?: string;
  activityFrequency?: string;
  nutritionalGoal?: string;
  diseases?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  cookingAffinity?: string;
  city?: string;
  country?: string;
  location?: { lat: number; lng: number };
  locationEnabled?: boolean;
  [key: string]: any;
}

// Cache setup
const userProfileCache = new Map<string, { profile: UserProfile; timestamp: number }>();
const pantryCache = new Map<string, { items: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiter initialization
const rateLimiter = db ? new UserRateLimiter(db) : null;

// Utility functions
function safeLog(level: 'log' | 'error' | 'warn', message: string, error?: any) {
  const timestamp = new Date().toISOString();
  if (level === 'error' && error) {
    console.error(`[${timestamp}] ${message}`, error);
  } else if (level === 'warn') {
    console.warn(`[${timestamp}] ${message}`, error || '');
  } else {
    console.log(`[${timestamp}] ${message}`, error || '');
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise,
  ]);
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

async function getUserProfileCached(userId: string): Promise<UserProfile> {
  const cached = userProfileCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.profile;
  }

  if (!db) throw new Error('Firebase not initialized');
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new Error('Usuario no encontrado');
  }

  const profile = userDoc.data() as UserProfile;
  userProfileCache.set(userId, { profile, timestamp: Date.now() });
  return profile;
}

async function getPantryItemsCached(userId: string): Promise<string[]> {
  const cached = pantryCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.items;
  }

  if (!db) throw new Error('Firebase not initialized');
  const pantryDoc = await db.collection('user_pantry').doc(userId).get();
  
  let items: string[] = [];
  if (pantryDoc.exists) {
    const data = pantryDoc.data();
    items = data?.items?.map((item: any) => item.name || '').filter(Boolean) || [];
  }

  pantryCache.set(userId, { items, timestamp: Date.now() });
  return items;
}

function sanitizeRecommendation(rec: any, city: string): any {
  const name = (rec.nombre_restaurante || '').replace(/[^\w\s\-&,áéíóúñ]/gi, '').trim();
  const address = (rec.direccion_aproximada || '').replace(/[^\w\s\-&,áéíóúñ]/gi, '').trim();
  const cleanCity = (city || '').replace(/[^\w\s\-&áéíóúñ]/gi, '').trim();
  
  const query = address
    ? `${name} ${address} ${cleanCity}`
    : `${name} ${cleanCity}`;
  
  rec.link_maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
  rec.direccion_aproximada = address || `En ${cleanCity}`;
  rec.por_que_es_bueno = rec.por_que_es_bueno || "Opción saludable disponible";
  rec.plato_sugerido = rec.plato_sugerido || "Consulta el menú saludable";
  rec.hack_saludable = rec.hack_saludable || "Pide porciones pequeñas";
  
  return rec;
}

// Verify restaurant exists with Google Places and get real address
// Search for nearby restaurants using Google Places API
async function searchNearbyRestaurants(
  city: string,
  userLocation?: { lat: number; lng: number },
  cuisine?: string,
  budget?: string
): Promise<Array<{
  name: string;
  address: string;
  place_id: string;
  rating?: number;
  price_level?: number;
  link_maps: string;
}>> {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) return [];

  try {
    let url: string;

    if (userLocation) {
      // Nearby Search si tenemos coordenadas GPS
      const keyword = cuisine ? encodeURIComponent(cuisine) : 'restaurant';
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.lat},${userLocation.lng}&radius=3000&type=restaurant&keyword=${keyword}&language=es&key=${GOOGLE_MAPS_API_KEY}`;
    } else {
      // Text Search si solo tenemos ciudad
      const query = cuisine
        ? encodeURIComponent(`restaurantes ${cuisine} en ${city}`)
        : encodeURIComponent(`restaurantes en ${city}`);
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=es&key=${GOOGLE_MAPS_API_KEY}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return [];

    // Tomar los primeros 10 resultados y formatearlos
    return data.results.slice(0, 10).map((place: any) => ({
      name: place.name,
      address: place.vicinity || place.formatted_address || city,
      place_id: place.place_id,
      rating: place.rating,
      price_level: place.price_level,
      link_maps: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    }));
  } catch {
    return [];
  }
}

// Format places for inclusion in Gemini prompt
function formatPlacesForPrompt(places: Array<{
  name: string;
  address: string;
  rating?: number;
  price_level?: number;
}>): string {
  if (!places.length) return '';
  
  return places.map((p, i) => {
    const price = p.price_level ? '$'.repeat(p.price_level) : '?';
    const rating = p.rating ? `★${p.rating}` : '';
    return `${i + 1}. "${p.name}" | ${p.address} | ${price} ${rating}`.trim();
  }).join('\n');
}

// CORS headers function
function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (isOriginAllowed(origin || undefined)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }

  return headers;
}

// JSON templates matching backup schemas
const RECIPE_JSON_TEMPLATE = `{"saludo_personalizado":"msg motivador","receta":{"recetas":[{"id":1,"titulo":"nombre","tiempo_estimado":"XX min","dificultad":"Fácil|Media|Difícil","coincidencia_despensa":"ingrediente casa o Ninguno","ingredientes":["cantidad+ingrediente"],"pasos_preparacion":["paso 1","paso 2"],"macros_por_porcion":{"kcal":0,"proteinas_g":0,"carbohidratos_g":0,"grasas_g":0}},{"id":2,"titulo":"nombre","tiempo_estimado":"XX min","dificultad":"Fácil|Media|Difícil","coincidencia_despensa":"ingrediente casa o Ninguno","ingredientes":["cantidad+ingrediente"],"pasos_preparacion":["paso 1","paso 2"],"macros_por_porcion":{"kcal":0,"proteinas_g":0,"carbohidratos_g":0,"grasas_g":0}},{"id":3,"titulo":"nombre","tiempo_estimado":"XX min","dificultad":"Fácil|Media|Difícil","coincidencia_despensa":"ingrediente casa o Ninguno","ingredientes":["cantidad+ingrediente"],"pasos_preparacion":["paso 1","paso 2"],"macros_por_porcion":{"kcal":0,"proteinas_g":0,"carbohidratos_g":0,"grasas_g":0}}]}}`;

const RESTAURANT_JSON_TEMPLATE = `{"saludo_personalizado":"msg motivador","recomendaciones":[{"id":1,"nombre_restaurante":"nombre real","tipo_comida":"ej: Italiana","direccion_aproximada":"Calle Número, Colonia","plato_sugerido":"nombre plato","por_que_es_bueno":"explicar por qué","hack_saludable":"consejo práctico"}]}`;

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 200, headers });
}

// GET handler with rate limit status
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (!adminApp || !db) {
    return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500, headers });
  }

  if (!isOriginAllowed(origin || undefined)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ') || !auth) {
    return NextResponse.json({ error: 'Auth token required' }, { status: 401, headers });
  }

  let userId: string;
  try {
    const token = authHeader.substring(7);
    const decoded = await auth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid auth token' }, { status: 401, headers });
  }

  if (!rateLimiter) {
    return NextResponse.json({
      canRequest: true,
      requestsInWindow: 0,
      remainingRequests: 2,
      nextAvailableIn: 0,
    }, { headers });
  }

  // getStatus() es read-only — NO consume rate limit
  const status = await rateLimiter.getStatus(userId);

  if (!status) {
    return NextResponse.json({
      canRequest: true,
      requestsInWindow: 0,
      remainingRequests: 2,
      nextAvailableIn: 0,
    }, { headers });
  }

  return NextResponse.json({
    canRequest: status.canRequest,
    requestsInWindow: status.requestsInWindow,
    currentProcess: status.currentProcess,
    nextAvailableAt: status.nextAvailableAt,
    nextAvailableIn: status.nextAvailableAt
      ? Math.max(0, Math.ceil((status.nextAvailableAt - Date.now()) / 1000))
      : 0,
  }, { headers });
}

// Main POST handler
export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  
  let interactionRef: DocumentReference | null = null;
  let userId: string | null = null;

  try {
    // Check Firebase initialization
    if (!adminApp || !auth || !db) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500, headers }
      );
    }

    // Verify origin
    if (!isOriginAllowed(origin || undefined)) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403, headers }
      );
    }

    // Auth verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401, headers }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const authenticatedUserId = decodedToken.uid;

    // Parse and validate request body
    const body = await request.json();
    const requestData = RequestBodySchema.parse(body);
    
    userId = requestData.userId;
    const interactionId = requestData._id || `int_${Date.now()}`;

    // Verify user matches token
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'No autorizado para este usuario' },
        { status: 403, headers }
      );
    }

    // Check rate limit
    if (rateLimiter) {
      const rateLimitResult = await rateLimiter.checkRateLimit(userId);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: `Too many requests. ${rateLimitResult.secondsLeft ? `Try again in ${rateLimitResult.secondsLeft} seconds.` : 'Please try again later.'}`
          },
          { status: 429, headers }
        );
      }
    }

    // Create interaction document
    interactionRef = db.collection('user_interactions').doc(interactionId);
    await interactionRef.set({
      user_id: userId,
      interaction_id: interactionId,
      type: requestData.type,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
      request_data: requestData,
    }, { merge: true });

    // Get user profile (cached)
    const user = await getUserProfileCached(userId);

    // Get pantry items for recipes (cached)
    let pantryItems: string[] = [];
    if (requestData.type === "En casa") {
      pantryItems = await getPantryItemsCached(userId);
      // Add additional ingredientes from request
      if (requestData.ingredientes && requestData.ingredientes.length > 0) {
        pantryItems = [...pantryItems, ...requestData.ingredientes];
      }
    }

    // Build prompt based on request type
    let prompt = "";
    let realRestaurants: Array<{
      name: string;
      address: string;
      place_id: string;
      rating?: number;
      price_level?: number;
      link_maps: string;
    }> = [];
    
    if (requestData.type === "En casa") {
      const pantryText = pantryItems.length > 0 ? pantryItems.join(", ") : "Sin ingredientes disponibles";
      const profileParts = [
        user.eatingHabit ? `Dieta: ${user.eatingHabit}` : "",
        user.nutritionalGoal || "saludable",
        ...(ensureArray(user.diseases).length > 0 ? [`Condiciones: ${ensureArray(user.diseases).join(", ")}`] : []),
        ...(ensureArray(user.allergies).length > 0 ? [`Alergias: ${ensureArray(user.allergies).join(", ")}`] : []),
        ...(ensureArray(user.dislikedFoods).length > 0 ? [`No le gusta: ${ensureArray(user.dislikedFoods).join(", ")}`] : []),
      ].filter(Boolean).join(" | ");

      const cookingTimeText = requestData.cookingTime ? `máximo ${requestData.cookingTime} min` : "30-45 min realista";
      const mealTypeText = requestData.mealType ? `\nMOMENTO: ${requestData.mealType}` : "";
      const onlyPantryRule = requestData.onlyPantryIngredients 
        ? "\n⚠️ OBLIGATORIO: Usa ÚNICAMENTE ingredientes de la despensa listada. NO agregues ingredientes externos."
        : "";

      prompt = `Eres chef especializado en cocina casera saludable. Crea 3 recetas adaptadas al perfil.

PERFIL: ${profileParts || "Sin restricciones"}
DESPENSA: ${pantryText}${mealTypeText}
SOLICITUD: ${Array.isArray(requestData.cravings) ? requestData.cravings.join(", ") : (requestData.cravings || "saludable")}, ${cookingTimeText}

REGLAS CRÍTICAS:
1. USA máximo ingredientes disponibles en despensa
2. Si despensa insuficiente: añade 2-3 ingredientes básicos fáciles de conseguir
3. Tiempo real: ${cookingTimeText}
4. Pasos claros numerados (máximo 8 pasos)
5. Macros aproximados por porción en NÚMEROS${onlyPantryRule}
6. Devuelve EXACTAMENTE 3 recetas en el array "recetas"

Responde EXCLUSIVAMENTE en ${requestData.language === "en" ? "INGLÉS." : "ESPAÑOL."}
Responde en formato JSON usando esta estructura exacta:
${RECIPE_JSON_TEMPLATE}

Personaliza saludo_personalizado con mensaje motivador.
En coincidencia_despensa indica qué ingredientes de casa usas o "Ninguno" si requiere comprar todo.`;

    } else {
      // Restaurant logic
      const profileParts = [
        user.eatingHabit ? `Dieta: ${user.eatingHabit}` : "",
        user.nutritionalGoal || "saludable",
        ...(ensureArray(user.diseases).length > 0 ? [`Condiciones: ${ensureArray(user.diseases).join(", ")}`] : []),
        ...(ensureArray(user.allergies).length > 0 ? [`Alergias: ${ensureArray(user.allergies).join(", ")}`] : []),
      ].filter(Boolean).join(" | ");

      const budgetText = requestData.budget || "precio medio";
      const cravingsText = Array.isArray(requestData.cravings) ? requestData.cravings.join(", ") : (requestData.cravings || "saludable");
      const solicitudText = `${cravingsText}, presupuesto: ${budgetText}${requestData.currency ? ` (${requestData.currency})` : ""}`;

      // Search for real restaurants with Places API first
      realRestaurants = await searchNearbyRestaurants(
        user.city || '',
        requestData.userLocation || undefined,
        Array.isArray(requestData.cravings)
          ? requestData.cravings[0]
          : requestData.cravings || undefined,
        requestData.budget || undefined
      );

      const placesContext = realRestaurants.length > 0
        ? `\n\nRESTAURANTES REALES DISPONIBLES EN GOOGLE MAPS (usa SOLO estos):\n${formatPlacesForPrompt(realRestaurants)}\n\nINSTRUCCIÓN CRÍTICA: Recomienda ÚNICAMENTE restaurantes de la lista anterior. No inventes ninguno. Usa el nombre y dirección exactamente como aparecen en la lista.`
        : '';

      prompt = `Eres guía gastronómico. Recomienda 5 restaurantes reales.

PERFIL: ${profileParts || "Sin restricciones"}
UBICACIÓN: ${user.city || "su ciudad"}
SOLICITUD: ${solicitudText}
${placesContext}

REGLAS CRÍTICAS:
1. ${realRestaurants.length > 0 
    ? 'USA ÚNICAMENTE los restaurantes de la lista proporcionada arriba'
    : 'Nombres reales de restaurantes existentes en ' + (user.city || 'la ciudad')}
2. DIRECCIONES EXACTAS: Calle Número, Colonia (ej: "Calle Arturo Soria 126, Chamartín")
3. Si no sabes dirección exacta: usa centro comercial específico
4. NO uses "por el centro" o direcciones vagas
5. Rango máximo: 8km del centro

Responde EXCLUSIVAMENTE en ${requestData.language === "en" ? "INGLÉS." : "ESPAÑOL."}
Responde en formato JSON usando esta estructura exacta:
${RESTAURANT_JSON_TEMPLATE}

Personaliza el saludo_personalizado con mensaje motivador.
En por_que_es_bueno explica por qué es buena opción.
En hack_saludable da consejo práctico.`;
    }

    // Prepare Gemini AI
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no configurada");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    // Generate recommendation with timeout
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: requestData.type === "En casa" ? 0.4 : 0.2,
          maxOutputTokens: requestData.type === "En casa" ? AI_LIMITS.TOKENS_RECIPES : AI_LIMITS.TOKENS_RESTAURANTS,
          responseMimeType: "application/json",
          topP: requestData.type === "En casa" ? 0.9 : 0.8,
          topK: 30,
        },
      }),
      TIMEOUTS.GEMINI_GENERATION,
      "Gemini generation"
    );

    let parsedData: any;
    const responseText = result.response.text();
    
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from markdown
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || responseText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch (innerError: any) {
          const preview = (jsonMatch[1] || jsonMatch[0] || "").substring(0, 200);
          safeLog("error", "JSON extraído es inválido:", preview);
          throw new Error(`Invalid JSON extracted from response: ${innerError.message}`);
        }
      } else {
        const preview = responseText.substring(0, 200);
        safeLog("error", "No se encontró JSON en respuesta:", preview);
        throw new Error("No se pudo parsear la respuesta de Gemini");
      }
    }

    // Validate response structure
    try {
      if (requestData.type === "En casa") {
        parsedData = RecipeResponseSchema.parse(parsedData);
      } else {
        parsedData = RestaurantResponseSchema.parse(parsedData);
      }
    } catch (validationError: any) {
      safeLog("error", "Respuesta de Gemini inválida", validationError);
      throw new Error("La respuesta del modelo no cumple con el formato esperado");
    }

    // Post-processing for restaurants (enrich with Google Places data)
    if (requestData.type === "Fuera" && parsedData.recomendaciones) {
      parsedData.recomendaciones = parsedData.recomendaciones.map((rec: any) => {
        // Search in the Places list for the restaurant that Gemini chose
        const matched = realRestaurants.find(
          (p) => p.name.toLowerCase().includes(rec.nombre_restaurante.toLowerCase()) ||
                 rec.nombre_restaurante.toLowerCase().includes(p.name.toLowerCase())
        );

        return {
          ...rec,
          direccion_aproximada: matched?.address || rec.direccion_aproximada || `En ${user.city || ''}`,
          link_maps: matched?.link_maps ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.nombre_restaurante + ' ' + (user.city || ''))}`,
          por_que_es_bueno: rec.por_que_es_bueno || 'Opción saludable disponible',
          plato_sugerido: rec.plato_sugerido || 'Consulta el menú saludable',
          hack_saludable: rec.hack_saludable || 'Pide porciones pequeñas',
          verified: !!matched,
        };
      });
    }

    // Save to Firestore with batch
    const batch = db.batch();
    const historyCol = requestData.type === "En casa" ? "historial_recetas" : "historial_recomendaciones";
    
    const historyRef = db.collection(historyCol).doc();
    batch.set(historyRef, {
      user_id: userId,
      interaction_id: interactionId,
      fecha_creacion: FieldValue.serverTimestamp(),
      tipo: requestData.type,
      ...parsedData,
    });

    batch.update(interactionRef, {
      procesado: true,
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      historyDocId: historyRef.id,
    });

    await batch.commit();

    // Marcar proceso como completado en rate limiter
    if (rateLimiter && userId) {
      try {
        await rateLimiter.completeProcess(userId);
      } catch (rlError) {
        safeLog('warn', 'Error completing rate limit process', rlError);
      }
    }

    return NextResponse.json(parsedData, { headers });

  } catch (error: any) {
    safeLog("error", "Error in POST /api/recommend", error);
    
    // Update interaction status if we have a reference
    if (interactionRef && db) {
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

    // Marcar proceso como fallido (no cuenta para rate limit)
    if (rateLimiter && userId) {
      try {
        await rateLimiter.failProcess(userId, error?.message || 'Unknown error');
      } catch (rlError) {
        safeLog('warn', 'Error failing rate limit process', rlError);
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}