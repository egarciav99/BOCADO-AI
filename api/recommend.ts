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
// 2. TIPOS Y INTERFACES
// ============================================
interface UserProfile {
  nutritionalGoal?: string;
  allergies?: string[];
  diseases?: string[];
  dislikedFoods?: string[];
  city?: string;
  country?: string;
  gender?: string;
  age?: string;
  weight?: string;
  height?: string;
  activityLevel?: string;
  activityFrequency?: string;
}

interface RequestBody {
  userId: string;
  type: 'En casa' | 'Fuera';
  mealType?: string;
  cookingTime?: string;
  cravings?: string;
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
  };
}

// ============================================
// 3. FUNCIONES DE UTILIDAD (De tu n8n)
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
  return root
    .replace(/a/g, '[aáàäâ]')
    .replace(/e/g, '[eéèëê]')
    .replace(/i/g, '[iíìïî]')
    .replace(/o/g, '[oóòöô]')
    .replace(/u/g, '[uúùüû]');
};

const ensureArray = (input: any): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((i): i is string => typeof i === 'string');
  if (typeof input === 'string') return input.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

const formatList = (data: any): string => {
  if (!data) return "Ninguna";
  if (Array.isArray(data)) return data.length > 0 ? data.join(", ") : "Ninguna";
  if (typeof data === 'string') return data.trim() !== "" ? data : "Ninguna";
  return "Ninguna";
};

// ============================================
// 4. FILTROS DE SEGURIDAD ALIMENTARIA (De n8n)
// ============================================

const buildAirtableFormula = (user: UserProfile): string => {
  const conditions: string[] = [];
  
  // Reglas booleanas
  const prefs = ensureArray(user.allergies);
  if (prefs.includes("Vegano")) conditions.push("{Vegano} = TRUE()");
  if (prefs.includes("Vegetariano")) conditions.push("{Vegetariano} = TRUE()");
  if (prefs.includes("Celíaco")) conditions.push("{Celíaco} = TRUE()");
  if (prefs.includes("Intolerante a la lactosa")) conditions.push("{Intolerancia_lactosa} = TRUE()");
  if (prefs.includes("Alergia a frutos secos")) conditions.push("{Alergia_frutos_secos} = TRUE()");
  
  // Reglas numéricas
  const illnesses = ensureArray(user.diseases);
  if (illnesses.includes("Diabetes")) {
    conditions.push("AND({Índice_glucémico} < 55, {Azúcares_totales_g} < 10)");
  }
  if (illnesses.includes("Hipertensión")) conditions.push("{Sodio_mg} < 140");
  if (illnesses.includes("Colesterol")) {
    conditions.push("AND({Colesterol_mg} < 20, {Grasas_saturadas_g} < 1.5)");
  }
  if (illnesses.includes("Hipotiroidismo")) conditions.push("{Yodo_µg} > 10");
  if (illnesses.includes("Hipertiroidismo")) conditions.push("{Yodo_µg} < 50");
  if (illnesses.includes("Intestino irritable")) {
    conditions.push("AND({Fibra_dietética_g} > 1, {Fibra_dietética_g} < 10)");
  }
  
  // Filtro de dislikes
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
// 5. SISTEMA DE SCORING (Corregido)
// ============================================

const scoreIngredients = (
  airtableItems: AirtableIngredient[],
  pantryItems: any[]
): { priorityList: string; marketList: string; hasPantryItems: boolean } => {
  
  const pantryRoots = pantryItems
    .map(item => {
      // Maneja si la despensa viene como objetos o strings
      const txt = typeof item === 'object' ? (item.name || item.nombre || item.ingrediente) : String(item);
      return getRootWord(txt || "");
    })
    .filter(root => root && root.length > 2);
  
  const genericWords = ["aceite", "sal", "leche", "pan", "harina", "agua", "mantequilla", "crema", "salsa"];
  
  const scoredItems = airtableItems.map(atItem => {
    // CORRECCIÓN: Usamos los campos definidos en la interfaz
    const rawName = atItem.fields.México || 
                    atItem.fields.Ingrediente || 
                    atItem.fields.Nombre || // Ahora TypeScript lo reconocerá
                    atItem.fields.España;

    if (!rawName) return { name: "", score: 0 };
    
    const norm = normalizeText(rawName);
    const root = getRootWord(rawName);
    let score = 1;
    
    pantryRoots.forEach(pantryRoot => {
      if (root === pantryRoot) {
        score = 50;
        return;
      }
      
      const regex = new RegExp(`\\b${pantryRoot}\\b`, 'i');
      if (regex.test(norm)) {
        const wordCount = norm.split(/\s+/).length;
        if (wordCount > 2 && genericWords.includes(pantryRoot)) {
          return;
        }
        score = 20;
      }
    });
    
    return { name: rawName, score };
  }).filter(item => item.name);
  
  scoredItems.sort((a, b) => b.score - a.score);
  
  const priorityList = scoredItems.filter(i => i.score >= 20).map(i => i.name).join(", ");
  const marketList = scoredItems.filter(i => i.score < 20).map(i => i.name).join(", ");
  
  return { priorityList, marketList, hasPantryItems: priorityList.length > 0 };
};

// ============================================
// 6. CONSTRUCCIÓN DE PROMPTS (De n8n mejorado)
// ============================================

const buildRecipePrompt = (
  user: UserProfile,
  request: RequestBody,
  priorityIngredients: string,
  marketIngredients: string,
  hasPantryItems: boolean,
  historyContext: string
): string => {
  
  const dislikedString = formatList([...ensureArray(user.dislikedFoods), ...ensureArray(request.dislikedFoods)]);
  
  let inventoryInstruction = hasPantryItems ? `
### 🛒 GESTIÓN DE INVENTARIO (PRIORIDAD ECONÓMICA)
El usuario tiene estos ingredientes SEGUROS en casa:
**[ ${priorityIngredients} ]**
     
**INSTRUCCIÓN:**
1. Las recetas DEBEN incluir al menos un ingrediente principal de esta lista.
2. Ayuda al usuario a ahorrar usando lo que ya tiene.
  ` : `
### 🛒 GESTIÓN DE INVENTARIO
No hay coincidencias directas en la despensa. Usa libremente la lista de mercado.
  `;

  return `
Actúa como "Bocado", un asistente nutricional experto en medicina culinaria y ahorro.

### PERFIL CLÍNICO DEL USUARIO
* **Meta**: ${user.nutritionalGoal || "Comer saludable"}
* **Salud (Alergias/Enfermedades)**: ${formatList(user.diseases)}, ${formatList(user.allergies)}
* **NO LE GUSTA (PROHIBIDO USAR)**: ${dislikedString}
* **Ubicación**: ${user.city || "su ciudad"}, ${user.country || ""}

### CONTEXTO DE LA SOLICITUD
* **Ocasión**: ${request.mealType || "Comida principal"}
* **Tiempo Límite**: ${request.cookingTime || "30"} minutos
* **Presupuesto**: ${request.budget || "No especificado"} ${request.currency || ""}

${historyContext}

${inventoryInstruction}

### 🏪 LISTA DE MERCADO (INGREDIENTES COMPLEMENTARIOS SEGUROS)
Puedes completar las recetas usando estos ingredientes (ya validados por seguridad):
**[ ${marketIngredients} ]**
*(También puedes usar básicos de cocina: Aceite, Sal, Pimienta, Vinagre, Especias secas)*.

### INSTRUCCIONES DE SALIDA (JSON ESTRICTO)
1. Genera **3 RECETAS** distintas y creativas.
2. Devuelve **SOLO UN JSON VÁLIDO**. Sin texto antes ni después.
3. NO uses bloques de código Markdown.

Estructura del JSON requerida:
{
  "saludo_personalizado": "Un mensaje breve y cálido (sin usar nombre propio), motivando al usuario según su meta: ${user.nutritionalGoal || "Saludable"}.",
  "receta": {
    "recetas": [
      {
        "id": 1,
        "titulo": "Nombre Atractivo del Plato",
        "tiempo_estimado": "Ej: 25 min",
        "dificultad": "Fácil|Media|Difícil",
        "coincidencia_despensa": "Nombre del ingrediente de casa usado (o 'Ninguno')",
        "ingredientes": ["100g de Pollo", "1 cdta de Aceite..."],
        "pasos_preparacion": ["Paso 1...", "Paso 2..."],
        "macros_por_porcion": { "kcal": 0, "proteinas_g": 0, "carbohidratos_g": 0, "grasas_g": 0 }
      }
    ]
  }
}`;
};

const buildRestaurantPrompt = (
  user: UserProfile,
  request: RequestBody,
  historyContext: string
): string => {
  
  const dislikedString = formatList([...ensureArray(user.dislikedFoods), ...ensureArray(request.dislikedFoods)]);
  
  return `
Actúa como "Bocado", un experto en nutrición y guía gastronómico local.

### PERFIL DEL USUARIO
* **Meta Nutricional**: ${user.nutritionalGoal || "Comer saludable"}
* **Restricciones de Salud**: ${formatList(user.diseases)}, ${formatList(user.allergies)}
* **ALIMENTOS QUE ODIA (EVITAR)**: ${dislikedString}
* **Ubicación**: ${user.city || "su ciudad"}, ${user.country || ""}

### SOLICITUD
El usuario quiere comer fuera.
* **Antojo / Tipo de cocina**: ${request.cravings || "Cualquier tipo"}
* **Presupuesto**: ${request.budget || "No especificado"} ${request.currency || ""}

${historyContext}

### TAREA
Genera **5 RECOMENDACIONES** de restaurantes o cadenas disponibles en **${user.city || "su ciudad"}** que se ajusten a este perfil.
* Si no conoces restaurantes específicos reales en esa ciudad, sugiere "Tipos de lugar" pero especifica qué buscar.
* Prioriza lugares que tengan opciones saludables alineadas con la meta: ${user.nutritionalGoal || "Saludable"}.

### INSTRUCCIONES DE SALIDA (JSON ESTRICTO)
1. Devuelve **SOLO UN JSON VÁLIDO**. Sin texto extra.
2. NO uses bloques de código Markdown.
3. Para "link_maps", usa: https://www.google.com/maps/search/?api=1&query={NombreRestaurante}+{Ciudad}

Estructura del JSON:
{
  "saludo_personalizado": "Mensaje corto y motivador",
  "ubicacion_detectada": "${user.city || "su ciudad"}, ${user.country || ""}",
  "recomendaciones": [
    {
      "id": 1,
      "nombre_restaurante": "Nombre del lugar",
      "tipo_comida": "Ej: Italiana / Vegana",
      "direccion_aproximada": "Calle, número, zona",
      "link_maps": "URL de búsqueda",
      "por_que_es_bueno": "Explicación breve",
      "plato_sugerido": "Nombre de plato específico",
      "hack_saludable": "Consejo experto"
    }
  ]
}`;
};

// ============================================
// 7. HANDLER PRINCIPAL
// ============================================

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const request: RequestBody = req.body;
    const { userId, type, _id } = request;
    const interactionId = _id || `int_${Date.now()}`;

    // Validaciones
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    if (!type || !['En casa', 'Fuera'].includes(type)) {
      return res.status(400).json({ error: 'type debe ser "En casa" o "Fuera"' });
    }

    // Obtener usuario
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = userSnap.data() as UserProfile;

    // Obtener historial
    const historyCol = type === 'En casa' ? 'historial_recetas' : 'historial_recomendaciones';
    const historySnap = await db.collection(historyCol)
      .where('user_id', '==', userId)
      .orderBy('fecha_creacion', 'desc')
      .limit(5)
      .get();
    
    let historyContext = "";
    if (!historySnap.empty) {
      const forbiddenItems = historySnap.docs.map(doc => {
        const data = doc.data();
        return type === 'En casa' 
          ? data.receta?.recetas?.map((r: any) => r.titulo)
          : data.recomendaciones?.map((r: any) => r.nombre_restaurante);
      }).flat().filter(Boolean);
      
      if (forbiddenItems.length > 0) {
        historyContext = `
### 🧠 MEMORIA (NO REPETIR)
Recientemente recomendaste: ${forbiddenItems.join(", ")}.
INTENTA VARIAR Y NO REPETIR ESTOS NOMBRES.
        `;
      }
    }

    // Configurar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    let prompt: string;

    if (type === 'En casa') {
      // Obtener ingredientes de Airtable con filtros de seguridad
      const formula = buildAirtableFormula(user);
      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=100`,
        { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
      );
      
      if (!airtableRes.ok) throw new Error("Error fetching Airtable");
      
      const airtableData = await airtableRes.json();
      const safeIngredients: AirtableIngredient[] = airtableData.records || [];
      
      // Obtener despensa del usuario
      const pantrySnap = await db.collection('user_pantry').doc(userId).get();
      const pantryData = pantrySnap.exists ? pantrySnap.data()?.items || [] : [];
      
      // Scoring
      const { priorityList, marketList, hasPantryItems } = scoreIngredients(safeIngredients, pantryData);
      
      // Construir prompt
      prompt = buildRecipePrompt(user, request, priorityList, marketList, hasPantryItems, historyContext);
      
    } else {
      // Fuera: restaurantes
      prompt = buildRestaurantPrompt(user, request, historyContext);
    }

    // Generar con Gemini
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    
    // Parsear JSON
    let parsedData: any;
    try {
      // Intentar parsear directamente
      parsedData = JSON.parse(responseText);
    } catch (e) {
      // Si falla, intentar extraer de markdown
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) throw new Error("No se encontró JSON válido");
      parsedData = JSON.parse(responseText.substring(startIdx, endIdx + 1));
    }

    // Guardar en Firestore
    const docToSave = {
      user_id: userId,
      interaction_id: interactionId,
      fecha_creacion: FieldValue.serverTimestamp(),
      tipo: type,
      ...parsedData
    };

    await db.collection(historyCol).add(docToSave);
    await db.collection('user_interactions').doc(interactionId).set({ 
      procesado: true,
      updatedAt: FieldValue.serverTimestamp() 
    }, { merge: true });

    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error("❌ Error:", error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}