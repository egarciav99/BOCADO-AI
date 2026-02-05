import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

    const userSnap = await db.collection('users').doc(userId).get();
    const user = userSnap.exists ? userSnap.data() : {};

    let safeIngredients = [];
    try {
      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}?maxRecords=50`,
        { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
      );
      const airtableData = await airtableRes.json();
      safeIngredients = airtableData.records?.map((r: any) => r.fields.México || r.fields.Ingrediente) || [];
    } catch (e) {}

    let preferenceContext = "";
    try {
      const historySnap = await db.collection('user_history')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc').limit(5).get();
      if (!historySnap.empty) {
        const feedback = historySnap.docs.map(doc => `- ${doc.data().itemId}: ${doc.data().rating}/5`).join('\n');
        preferenceContext = `\nPREFERENCIAS DEL USUARIO:\n${feedback}`;
      }
    } catch (e) {}

    const location = user?.city || user?.countryName || "su ubicación";

    const prompt = type === 'En casa' ? `
    Actúa como "Bocado", nutricionista. Genera 3 recetas de ${mealType}.
    META: ${user?.nutritionalGoal || 'Saludable'}. TIEMPO: ${cookingTime}min.
    ${preferenceContext}
    
    Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
    {
      "saludo_personalizado": "..",
      "receta": {
        "recetas": [
          {
            "id": 1,
            "titulo": "..",
            "tiempo_estimado": "..",
            "dificultad": "..",
            "coincidencia_despensa": "Ninguno",
            "ingredientes": [".."],
            "pasos_preparacion": [".."],
            "macros_por_porcion": {
              "kcal": 0,
              "proteinas_g": 0,
              "carbohidratos_g": 0,
              "grasas_g": 0
            }
          }
        ]
      }
    }` : `
    Actúa como "Bocado", guía experto en ${location}. Sugiere 5 restaurantes reales para: ${cravings}.
    PRESUPUESTO: ${budget} en moneda ${currency}.${preferenceContext}
    Responde ÚNICAMENTE en JSON con esta estructura:
    {
      "saludo_personalizado": "..",
      "recomendaciones": [
        {
          "nombre_restaurante": "..",
          "tipo_comida": "..",
          "direccion_aproximada": "..",
          "link_maps": "..",
          "plato_sugerido": "..",
          "por_que_es_bueno": "..",
          "hack_saludable": ".."
        }
      ]
    }`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let parsedData;
    try {
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');
      parsedData = JSON.parse(responseText.substring(startIdx, endIdx + 1));
    } catch (e) { throw new Error("JSON malformado"); }

    const historyCol = type === 'En casa' ? 'historial_recetas' : 'historial_recomendaciones';
    const docToSave = {
      user_id: userId,
      interaction_id: interactionId, 
      fecha_creacion: FieldValue.serverTimestamp(), 
      ...parsedData
    };

    await db.collection(historyCol).add(docToSave);
    await db.collection('user_interactions').doc(interactionId).set({ 
      procesado: true,
      updatedAt: FieldValue.serverTimestamp() 
    }, { merge: true });

    return res.status(200).json(parsedData);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}