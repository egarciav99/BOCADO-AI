import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 1. INICIALIZACIÓN DE FIREBASE ADMIN
if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey.trim());
      initializeApp({ credential: cert(serviceAccount) });
    }
  } catch (error) {
    console.error("❌ Error Firebase Init:", error);
  }
}

const db = getFirestore();

const normalizeText = (text: string) => 
  text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { userId, type, mealType, cookingTime, cravings, budget, currency, _id } = req.body;
    const interactionId = _id || `int_${Date.now()}`;

    // 1. Obtener Perfil del Usuario
    const userSnap = await db.collection('users').doc(userId).get();
    const user = userSnap.exists ? userSnap.data() : {};

    // 2. Airtable (Ingredientes Seguros)
    let safeIngredients = [];
    try {
      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}?maxRecords=50`,
        { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
      );
      const airtableData = await airtableRes.json();
      safeIngredients = airtableData.records?.map((r: any) => r.fields.México || r.fields.Ingrediente) || [];
    } catch (e) {
      console.error("⚠️ Falló Airtable");
    }

    // 3. Despensa
    let priorityList = [];
    try {
      const pantrySnap = await db.collection('user_pantry').where('userId', '==', userId).get();
      const pantryNames = pantrySnap.docs.map(doc => doc.data().name || doc.data().items || []).flat();
      priorityList = safeIngredients.filter((ing: string) => 
        pantryNames.some(p => normalizeText(ing).includes(normalizeText(p)))
      );
    } catch (e) {}

    // 4. Contexto Geográfico y Preferencias
    const location = user?.city || user?.countryName || "su ubicación actual";
    const userCravings = Array.isArray(cravings) && cravings.length > 0 ? cravings.join(", ") : "Opciones saludables y populares";

    // 5. Construcción del Prompt (Blindado)
    const prompt = type === 'En casa' ? `
    Actúa como "Bocado", nutricionista. Genera 3 recetas de ${mealType}.
    META: ${user?.nutritionalGoal || 'Saludable'}. TIEMPO: ${cookingTime}min.
    INGREDIENTES SEGUROS: ${safeIngredients.slice(0, 30).join(", ")}.
    USA ESTO DE DESPENSA: ${priorityList.join(", ")}.
    Responde solo JSON con esta estructura exacta: {"saludo_personalizado": "..", "recetas": []}` 
    : `
    Actúa como "Bocado", guía experto en ${location}. 
    Sugiere 5 restaurantes reales para: ${userCravings}.
    PRESUPUESTO: ${budget} en moneda ${currency}.
    IMPORTANTE: Asegúrate de que los restaurantes existan en ${location}.
    Responde solo JSON con esta estructura exacta: {"saludo_personalizado": "..", "recomendaciones": []}`;

    // 6. Generación con Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extracción segura de JSON
    let parsedData;
    try {
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');
      parsedData = JSON.parse(responseText.substring(startIdx, endIdx + 1));
    } catch (jsonError) {
      console.error("❌ Error parseando JSON de Gemini:", responseText);
      throw new Error("La IA devolvió un formato inválido.");
    }

    // 7. Guardado Sincronizado en Firestore
    try {
      const historyCol = type === 'En casa' ? 'historial_recetas' : 'historial_recomendaciones';
      
      const docToSave = {
        user_id: userId,
        interaction_id: interactionId, 
        fecha_creacion: FieldValue.serverTimestamp(), 
        ...parsedData
      };

      await db.collection(historyCol).add(docToSave);
      
      // Actualizar estado de la interacción
      await db.collection('user_interactions').doc(interactionId).set({ 
        procesado: true,
        updatedAt: FieldValue.serverTimestamp() 
      }, { merge: true });

    } catch (dbError) {
      console.error("❌ Error en guardado Firestore:", dbError);
    }

    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error("❌ ERROR API RECOMMEND:", error.message);
    return res.status(500).json({ 
      error: "Ocurrió un error al procesar la recomendación",
      details: error.message 
    });
  }
}