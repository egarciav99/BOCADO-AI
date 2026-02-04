import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. INICIALIZACIÓN GLOBAL DE FIREBASE ADMIN
// Evitamos re-inicializar en cada invocación de la Lambda
if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.error("❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY no definida en Vercel");
    } else {
      const sanitizedKey = serviceAccountKey.trim();
      const serviceAccount = JSON.parse(sanitizedKey);
      initializeApp({ credential: cert(serviceAccount) });
      console.log("✅ Firebase Admin conectado con éxito");
    }
  } catch (error: any) {
    console.error("❌ Error crítico al parsear Service Account:", error.message);
  }
}

const db = getFirestore();

// 2. FUNCIONES DE AYUDA PARA NORMALIZACIÓN Y BÚSQUEDA
const normalizeText = (text: string) => 
  text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

const getRootWord = (text: string) => {
  let clean = normalizeText(text);
  if (clean.length <= 3) return clean;
  if (clean.endsWith('ces')) return clean.slice(0, -3) + 'z';
  if (clean.endsWith('es')) return clean.slice(0, -2);
  if (clean.endsWith('s')) return clean.slice(0, -1);
  return clean;
};

const createRegexPattern = (text: string) => {
  const root = getRootWord(text);
  return root.replace(/a/g, '[aá]').replace(/e/g, '[eé]').replace(/i/g, '[ií]').replace(/o/g, '[oó]').replace(/u/g, '[uú]');
};

// 3. HANDLER PRINCIPAL (API VERCEL)
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { userId, type, mealType, cookingTime, cravings, budget, currency, _id } = req.body;
    const interactionId = _id || `int_${Date.now()}`;
    const now = new Date().toISOString();

    // --- BLOQUE 1: Perfil del Usuario ---
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) throw new Error("Usuario no encontrado");
    const user = userSnap.data() || {};

    // --- BLOQUE 2: Filtrado de Seguridad (Airtable) ---
    let conditions = [];
    const allergies = user.allergies || [];
    const diseases = user.diseases || [];
    const dislikedFoods = [...new Set([...(user.dislikedFoods || []), ...(req.body.dislikedFoods || [])])];

    if (allergies.includes("Vegano")) conditions.push("{Vegano} = TRUE()");
    if (allergies.includes("Celíaco")) conditions.push("{Celíaco} = TRUE()");
    if (diseases.includes("Diabetes")) conditions.push("AND({Índice_glucémico} < 55, {Azúcares_totales_g} < 10)");
    if (diseases.includes("Hipertensión")) conditions.push("{Sodio_mg} < 140");

    dislikedFoods.forEach(food => {
      const pattern = createRegexPattern(food);
      conditions.push(`NOT(REGEX_MATCH(CONCATENATE({Ingrediente}, " ", {México}), '(?i)${pattern}'))`);
    });

    const airtableFormula = conditions.length > 0 ? `AND(${conditions.join(", ")})` : "TRUE()";
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(airtableFormula)}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const airtableData = await airtableRes.json();
    const safeIngredients = airtableData.records?.map((r: any) => r.fields.México || r.fields.Ingrediente) || [];

    // --- BLOQUE 3: Contexto de Despensa ---
    const pantrySnap = await db.collection('user_pantry').where('userId', '==', userId).get();
    const pantryNames = pantrySnap.docs.map(doc => {
        const data = doc.data();
        return data.name || data.items || [];
    }).flat();
    
    const priorityList = safeIngredients.filter((ing: string) => 
      pantryNames.some(p => normalizeText(ing).includes(normalizeText(p)))
    );

    // --- BLOQUE 4: Preferencias y Feedback (Aprendizaje) ---
    const feedbackSnap = await db.collection('user_history')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const experiences = feedbackSnap.docs.map(doc => {
      const d = doc.data();
      return `- ${d.itemId}: Calificación ${d.rating}/5 estrellas.`;
    }).join('\n');

    const preferenceContext = experiences.length > 0 
      ? `\nHISTORIAL DE GUSTOS: Al usuario le gustaron estos platos: \n${experiences}`
      : "";

    // --- BLOQUE 5: Definición del Prompt Inteligente ---
    const prompt = type === 'En casa' ? `
    Actúa como "Bocado", nutricionista clínico.
    REGLAS: Solo ingredientes seguros: [${safeIngredients.slice(0, 50).join(", ")}].
    PRIORIDAD: Usa ingredientes de la despensa: [${priorityList.join(", ")}].
    TIEMPO: Máximo ${cookingTime} minutos.
    META: ${user.nutritionalGoal}. SALUD: ${diseases.join(", ")}.${preferenceContext}

    TAREA: Genera 3 recetas saludables. Responde ÚNICAMENTE en JSON:
    {
      "saludo_personalizado": "...",
      "recetas": [{ "id": 1, "titulo": "...", "tiempo_estimado": "...", "ingredientes": [], "pasos_preparacion": [], "macros_por_porcion": {} }]
    }` : `
    Actúa como "Bocado", guía gastronómico experto en ${user.city}. 
    ANTOJO: ${cravings}.
    PRESUPUESTO: El usuario tiene un presupuesto ${budget} (Moneda: ${currency}).
    META: ${user.nutritionalGoal}. SALUD: ${diseases.join(", ")}.${preferenceContext}

    TAREA: Sugiere 5 restaurantes REALES en ${user.city} que se ajusten al presupuesto ${budget}.
    Responde ÚNICAMENTE en JSON con esta estructura exacta:
    {
      "saludo_personalizado": "...",
      "recomendaciones": [
        {
          "id": 1,
          "nombre_restaurante": "...",
          "tipo_comida": "...",
          "link_maps": "https://www.google.com/maps/search/?api=1&query={nombre_restaurante}+${user.city}",
          "por_que_es_bueno": "...",
          "plato_sugerido": "...",
          "hack_saludable": "..."
        }
      ]
    }`;

    // --- BLOQUE 6: Ejecución de Gemini 2.0 Flash ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const startJson = responseText.indexOf('{');
    const endJson = responseText.lastIndexOf('}');
    const parsedData = JSON.parse(responseText.substring(startJson, endJson + 1));

    // --- BLOQUE 7: Guardado de Interacción y Metadatos ---
    const historyCol = type === 'En casa' ? 'historial_recetas' : 'historial_recomendaciones';
    const finalObject = {
      user_id: userId,
      user_interactions: interactionId,
      fecha_creacion: now,
      budget: budget || 'N/A',
      currency: currency || 'N/A',
      [type === 'En casa' ? 'receta' : 'recomendaciones']: parsedData
    };

    await db.collection(historyCol).add(finalObject);
    await db.collection('user_interactions').doc(interactionId).set({ procesado: true }, { merge: true });

    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error("❌ Error en Handler:", error.message);
    return res.status(500).json({ error: error.message });
  }
}