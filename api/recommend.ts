import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ============================================
// 1. INICIALIZACIÓN DE FIREBASE
// ============================================
if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no definida");
    }
    const serviceAccount = JSON.parse(serviceAccountKey.trim());
    initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("❌ Error Firebase Init:", error);
    throw error;
  }
}

const db = getFirestore();

// ============================================
// 2. TIPOS E INTERFACES
// ============================================
interface UserProfile {
  nutritionalGoal?: string;
  allergies?: string[];
  diseases?: string[];
  dislikedFoods?: string[];
  city?: string;
  countryName?: string;
}

interface RequestBody {
  userId: string;
  type: 'En casa' | 'Fuera';
  mealType?: string;
  cookingTime?: number;
  servings?: number; // ✅ Añadido comensales
  cravings?: string[];
  budget?: string;
  currency?: string;
  dislikedFoods?: string[];
  _id?: string;
}

interface AirtableIngredient {
  id: string;
  fields: {
    México?: string;
    España?: string;
    EUA?: string;
    Nombre?: string;
    Ingrediente?: string;
    Vegano?: boolean;
    Vegetariano?: boolean;
    Celíaco?: boolean;
    Intolerancia_lactosa?: boolean;
    Alergia_frutos_secos?: boolean;
    Índice_glucémico?: number;
    Sodio_mg?: number;
    Colesterol_mg?: number;
    Yodo_µg?: number;
    Fibra_dietética_g?: number;
    Azúcares_totales_g?: number;
    Grasas_saturadas_g?: number;
  };
}

// ============================================
// 3. FUNCIONES DE UTILIDAD
// ============================================
const normalizeText = (text: string): string => 
  text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

const getRootWord = (text: string): string => {
  let clean = normalizeText(text);
  if (clean.length <= 3) return clean;
  if (clean.endsWith('ces')) return clean.slice(0, -3) + 'z';
  if (clean.endsWith('es')) return clean.slice(0, -2);
  if (clean.endsWith('s')) return clean.slice(0, -1);
  return clean;
};

const createRegexPattern = (text: string): string => {
  const root = getRootWord(text);
  return root.replace(/a/g, '[aáàäâ]').replace(/e/g, '[eéèëê]').replace(/i/g, '[iíìïî]').replace(/o/g, '[oóòöô]').replace(/u/g, '[uúùüû]');
};

const ensureArray = (input: any): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((i): i is string => typeof i === 'string');
  if (typeof input === 'string') return input.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

const formatList = (data: any): string => {
  if (!data || (Array.isArray(data) && data.length === 0)) return "Ninguna";
  if (Array.isArray(data)) return data.join(", ");
  return String(data);
};

// ============================================
// 4. FILTROS DE SEGURIDAD ALIMENTARIA
// ============================================
const buildAirtableFormula = (user: UserProfile): string => {
  const conditions: string[] = [];
  const prefs = ensureArray(user.allergies);
  if (prefs.includes("Vegano")) conditions.push("{Vegano} = TRUE()");
  if (prefs.includes("Vegetariano")) conditions.push("{Vegetariano} = TRUE()");
  if (prefs.includes("Celíaco")) conditions.push("{Celíaco} = TRUE()");
  if (prefs.includes("Intolerante a la lactosa")) conditions.push("{Intolerancia_lactosa} = TRUE()");
  if (prefs.includes("Alergia a frutos secos")) conditions.push("{Alergia_frutos_secos} = TRUE()");
  
  const illnesses = ensureArray(user.diseases);
  if (illnesses.includes("Diabetes")) conditions.push("AND({Índice_glucémico} < 55, {Azúcares_totales_g} < 10)");
  if (illnesses.includes("Hipertensión")) conditions.push("{Sodio_mg} < 140");
  if (illnesses.includes("Colesterol")) conditions.push("AND({Colesterol_mg} < 20, {Grasas_saturadas_g} < 1.5)");
  
  const dislikes = ensureArray(user.dislikedFoods);
  if (dislikes.length > 0) {
    const searchTarget = 'CONCATENATE({Ingrediente}, " ", {México}, " ", {España}, " ", {EUA})';
    dislikes.forEach(foodItem => {
      const pattern = createRegexPattern(foodItem);
      conditions.push(`NOT(REGEX_MATCH(${searchTarget}, '(?i)${pattern}'))`);
    });
  }
  return conditions.length > 0 ? `AND(${conditions.join(", ")})` : "TRUE()";
};

// ============================================
// 5. SISTEMA DE SCORING
// ============================================
const scoreIngredients = (airtableItems: AirtableIngredient[], pantryItems: string[]) => {
  const pantryRoots = pantryItems.map(item => getRootWord(item)).filter(root => root && root.length > 2);
  const genericWords = ["aceite", "sal", "leche", "pan", "harina", "agua", "mantequilla", "crema", "salsa"];
  
  const scoredItems = airtableItems.map(atItem => {
    const rawName = atItem.fields.México || atItem.fields.Ingrediente || atItem.fields.Nombre || atItem.fields.España || "";
    if (!rawName) return { name: "", score: 0 };
    const norm = normalizeText(rawName);
    const root = getRootWord(rawName);
    let score = 1;
    pantryRoots.forEach(pantryRoot => {
      if (root === pantryRoot) score = 50;
      else if (new RegExp(`\\b${pantryRoot}\\b`, 'i').test(norm)) {
        if (!(norm.split(/\s+/).length > 2 && genericWords.includes(pantryRoot))) score = 20;
      }
    });
    return { name: rawName, score };
  }).filter(item => item.name);
  scoredItems.sort((a, b) => b.score - a.score);
  return {
    priorityList: scoredItems.filter(i => i.score >= 20).map(i => i.name).join(", "),
    marketList: scoredItems.filter(i => i.score < 20).map(i => i.name).join(", "),
    hasPantryItems: scoredItems.some(i => i.score >= 20)
  };
};

// ============================================
// 6. HANDLER PRINCIPAL
// ============================================
export default async function handler(req: any, res: any) {
  // ✅ CORRECCIÓN CORS: Headers antes de cualquier validación
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // LOG para depurar en Vercel
  console.log("Método recibido:", req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido', recibido: req.method });
  }

  try {
    const request: RequestBody = req.body;
    const { userId, type, _id, servings = 1 } = request;
    const interactionId = _id || `int_${Date.now()}`;

    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    // ✅ RATE LIMIT (10 segundos)
    const lastInteraction = await db.collection('user_interactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!lastInteraction.empty) {
      const lastTime = lastInteraction.docs[0].data().createdAt?.toMillis() || 0;
      if (Date.now() - lastTime < 10000) {
        return res.status(429).json({ error: "Vas muy rápido. Espera 10 segundos." });
      }
    }

    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) return res.status(404).json({ error: 'Usuario no encontrado' });
    const user = userSnap.data() as UserProfile;

    // Configuración Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }],
    });

    let finalPrompt = "";

    if (type === 'En casa') {
      const formula = buildAirtableFormula(user);
      const baseId = process.env.AIRTABLE_BASE_ID?.trim();
      const tableName = process.env.AIRTABLE_TABLE_NAME?.trim();
      const apiKey = process.env.AIRTABLE_API_KEY?.trim();

      const airtableUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId!)}/${encodeURIComponent(tableName!)}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=100`;
      
      const airtableRes = await fetch(airtableUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
      const airtableData = await airtableRes.json();
      const airtableItems = airtableData.records || [];

      const pantrySnap = await db.collection('user_pantry').where('userId', '==', userId).get();
      const pantryItems = pantrySnap.docs.map(doc => doc.data().name || "");
      const { priorityList, marketList, hasPantryItems } = scoreIngredients(airtableItems, pantryItems);

      // ✅ PROMPT CON COMENSALES
      finalPrompt = `Actúa como "Bocado", experto en nutrición y ahorro.
### CONTEXTO
* Comida: ${request.mealType} | Tiempo: ${request.cookingTime} min
* **PORCIONES/COMENSALES**: ${servings} persona(s)
* Meta: ${user.nutritionalGoal} | Salud: ${formatList(user.diseases)}, ${formatList(user.allergies)}
* NO USAR: ${formatList(user.dislikedFoods)}

### INVENTARIO
${hasPantryItems ? `En casa (USAR): [ ${priorityList} ]` : "Sin match en despensa."}
En mercado: [ ${marketList} ]

### TAREA
Genera 3 RECETAS. **IMPORTANTE**: Multiplica y ajusta todas las cantidades para alimentar a ${servings} personas.

Responde ÚNICAMENTE en JSON:
{
  "saludo_personalizado": "Cálido, menciona que es para ${servings} personas.",
  "receta": {
    "recetas": [{
      "id": 1,
      "titulo": "Nombre",
      "tiempo_estimado": "X min",
      "ingredientes": ["cantidad exacta para ${servings} + ingrediente", "..."],
      "pasos_preparacion": ["Paso 1..."],
      "macros_por_porcion": {"kcal": 0, "proteinas_g": 0, "carbohidratos_g": 0, "grasas_g": 0}
    }]
  }
}`;
    } else {
      finalPrompt = `Recomienda 5 restaurantes en ${user.city} para meta ${user.nutritionalGoal}. Presupuesto ${request.budget}. Responde en JSON.`;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    });

    const parsedData = JSON.parse(result.response.text());

    // Guardar en DB
    await db.collection(type === 'En casa' ? 'historial_recetas' : 'historial_recomendaciones').add({
      user_id: userId,
      fecha_creacion: FieldValue.serverTimestamp(),
      tipo: type,
      servings: servings,
      ...parsedData
    });

    await db.collection('user_interactions').doc(interactionId).set({ procesado: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}