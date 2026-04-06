import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// CORS setup
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    'https://bocado-ai.vercel.app',
    'https://bocado-git-main-egarciavs-projects.vercel.app',
    'http://localhost:3000'
  ];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (process.env.NODE_ENV === 'development') {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

// Initialize Firebase
function initializeFirebase() {
  try {
    // Import here to avoid circular dependency
    const { getApps, initializeApp, cert } = require('firebase-admin/app');
    
    if (!getApps().length) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no definida");
      }
      const serviceAccount = JSON.parse(serviceAccountKey.trim());
      initializeApp({ credential: cert(serviceAccount) });
    }
    
    return {
      auth: getAdminAuth(),
      db: getFirestore()
    };
  } catch (error) {
    console.error('Firebase init error:', error);
    throw error;
  }
}

// Request validation
const RequestBodySchema = z.object({
  type: z.enum(["En casa", "Fuera"]),
  userId: z.string(),
  interactionId: z.string(),
  cravings: z.string().optional(),
  dislikedFoods: z.array(z.string()).optional(),
  cookingTime: z.string().optional(),
  budget: z.string().optional(),
  currency: z.string().optional(),
  userLocation: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  language: z.enum(["es", "en"]).default("es")
});

// User cache interface
interface UserProfile {
  uid: string;
  eatingHabit?: string;
  age?: number;
  activityLevel?: string;
  nutritionalGoal?: string;
  diseases?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  city?: string;
  country?: string;
  location?: { lat: number; lng: number };
}

// Cache setup
const userProfileCache = new Map<string, { profile: UserProfile; timestamp: number }>();
const pantryCache = new Map<string, { items: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Utility functions
function safeLog(level: 'log' | 'error' | 'warn' | 'info', message: string, error?: any) {
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

  const { db } = initializeFirebase();
  const userDoc = await db.collection('usuarios').doc(userId).get();
  
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

  const { db } = initializeFirebase();
  const pantryDoc = await db.collection('pantry').doc(userId).get();
  
  let items: string[] = [];
  if (pantryDoc.exists) {
    const data = pantryDoc.data();
    items = data?.items?.map((item: any) => item.name || '').filter(Boolean) || [];
  }

  pantryCache.set(userId, { items, timestamp: Date.now() });
  return items;
}

// Constants 
const RECIPE_JSON_TEMPLATE = `{
  "saludo_personalizado": "Hola! Aquí tienes una receta perfecta",
  "receta": {
    "recetas": [{
      "titulo": "Nombre de la receta",
      "tiempo_preparacion": "30 min",
      "porciones": 4,
      "ingredientes": [{"nombre": "ingrediente", "cantidad": "200g"}],
      "instrucciones": ["Paso 1", "Paso 2"],
      "macronutrientes": {"calorias": 350, "proteinas": "25g", "carbohidratos": "30g", "grasas": "12g"},
      "coincidencia_despensa": "85%",
      "hack_saludable": "Consejo práctico"
    }]
  }
}`;

const RESTAURANT_JSON_TEMPLATE = `{
  "saludo_personalizado": "¡Perfecto! Te tengo excelentes opciones",
  "recomendaciones": [{
    "nombre_restaurante": "Nombre real",
    "direccion": "Calle Número, Colonia",
    "tipo_cocina": "italiana",
    "rango_precio": "€€",
    "por_que_es_bueno": "Explicación",
    "hack_saludable": "Consejo saludable"
  }]
}`;

// App Router handlers
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin') || '';
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 200, headers });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin') || '';
  const headers = getCorsHeaders(origin);
  return NextResponse.json({ status: 'ok', message: 'Recommend endpoint active' }, { headers });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin') || '';
  const headers = getCorsHeaders(origin);
  
  let interactionRef: any = null;

  try {
    // Initialize Firebase
    const { auth, db } = initializeFirebase();

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

    // Parse request
    const body = await request.json();
    const requestData = RequestBodySchema.parse(body);
    const { type, userId, interactionId } = requestData;

    // Verify user
    if (userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'No autorizado para este usuario' },
        { status: 403, headers }
      );
    }

    // Create interaction document
    interactionRef = db.collection('user_interactions').doc(interactionId);
    await interactionRef.set({
      user_id: userId,
      interaction_id: interactionId,
      type: type,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
      request_data: requestData,
    }, { merge: true });

    // Get user profile and pantry
    const user = await getUserProfileCached(userId);
    let pantryItems: string[] = [];
    if (type === "En casa") {
      pantryItems = await getPantryItemsCached(userId);
    }

    // Prepare Gemini AI
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no configurada");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    // Build prompt
    let prompt = "";
    
    if (type === "En casa") {
      const pantryText = pantryItems.length > 0 ? pantryItems.join(", ") : "Sin ingredientes disponibles";
      const profileParts = [
        user.eatingHabit ? `Dieta: ${user.eatingHabit}` : "",
        user.nutritionalGoal || "saludable",
        ...(ensureArray(user.allergies).length > 0 ? [`Alergias: ${ensureArray(user.allergies).join(", ")}`] : []),
        ...(ensureArray(user.dislikedFoods).length > 0 ? [`No le gusta: ${ensureArray(user.dislikedFoods).join(", ")}`] : []),
      ].filter(Boolean).join(" | ");

      prompt = `Eres chef especializado en cocina casera saludable. Crea 1 receta adaptada al perfil.

PERFIL: ${profileParts || "Sin restricciones"}
DESPENSA: ${pantryText}
SOLICITUD: ${requestData.cravings || "saludable"}${requestData.cookingTime ? `, máximo ${requestData.cookingTime} min` : ""}

REGLAS:
1. USA máximo ingredientes disponibles en despensa
2. Si despensa insuficiente: añade 2-3 ingredientes básicos
3. Tiempo realista: ${requestData.cookingTime ? `máximo ${requestData.cookingTime} min` : "30-45 min"}
4. Pasos claros (máximo 8)
5. Macros aproximados por porción

Responde EXCLUSIVAMENTE en ${requestData.language === "en" ? "INGLÉS" : "ESPAÑOL"}.
Formato JSON exacto:
${RECIPE_JSON_TEMPLATE}`;

    } else {
      // Restaurant logic
      const profileParts = [
        user.eatingHabit ? `Dieta: ${user.eatingHabit}` : "",
        user.nutritionalGoal || "saludable",
        ...(ensureArray(user.allergies).length > 0 ? [`Alergias: ${ensureArray(user.allergies).join(", ")}`] : []),
      ].filter(Boolean).join(" | ");

      prompt = `Eres guía gastronómico. Recomienda 5 restaurantes reales.

PERFIL: ${profileParts || "Sin restricciones"}
UBICACIÓN: ${user.city || "su ciudad"}
SOLICITUD: ${requestData.cravings || "saludable"}, ${requestData.budget || "precio medio"}

REGLAS:
1. Nombres reales de restaurantes en ${user.city || "la ciudad"}
2. Direcciones exactas: Calle Número, Colonia
3. NO direcciones vagas como "por el centro"
4. Rango máximo: 5km del centro

Responde EXCLUSIVAMENTE en ${requestData.language === "en" ? "INGLÉS" : "ESPAÑOL"}.
Formato JSON exacto:
${RESTAURANT_JSON_TEMPLATE}`;
    }

    // Generate with Gemini
    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: type === "En casa" ? 0.4 : 0.2,
          maxOutputTokens: type === "En casa" ? 2800 : 2200,
          responseMimeType: "application/json",
          topP: 0.8,
          topK: 30,
        },
      }),
      15000,
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
        } catch (innerError) {
          throw new Error(`JSON inválido en respuesta de Gemini`);
        }
      } else {
        throw new Error("No se pudo parsear respuesta de Gemini");
      }
    }

    // Save to Firestore
    const batch = db.batch();
    const historyCol = type === "En casa" ? "historial_recetas" : "historial_recomendaciones";
    
    const historyRef = db.collection(historyCol).doc();
    batch.set(historyRef, {
      user_id: userId,
      interaction_id: interactionId,
      fecha_creacion: FieldValue.serverTimestamp(),
      tipo: type,
      ...parsedData,
    });

    batch.update(interactionRef, {
      procesado: true,
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      historyDocId: historyRef.id,
    });

    await batch.commit();

    return NextResponse.json(parsedData, { headers });

  } catch (error: any) {
    safeLog("error", "Error in POST /api/recommend", error);
    
    if (interactionRef) {
      try {
        await interactionRef.update({
          status: "error",
          error: error.message,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch {}
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}