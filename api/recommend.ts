import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1. Configurar CORS para que tu frontend en Vercel pueda hablar con la API
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY no configurada en Vercel");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const userProfile = req.body;

    const prompt = `
      Actúa como un experto nutriólogo y chef profesional.
      Genera una recomendación nutricional personalizada para un usuario con este perfil:
      ${JSON.stringify(userProfile)}

      REGLAS ESTRICTAS:
      1. No uses ingredientes que estén en la lista de alergias o "dislikedFoods".
      2. Adapta la dificultad a su "cookingAffinity".
      3. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
      {
        "recommendation": "Breve análisis de sus metas",
        "recipes": [
          {
            "title": "Nombre",
            "description": "Por qué es buena para él",
            "ingredients": ["item 1", "item 2"],
            "instructions": ["paso 1", "paso 2"],
            "calories": 400,
            "prepTime": "20 min"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Limpiar posibles backticks de Markdown que Gemini a veces añade
    const jsonString = text.replace(/```json|```/gi, '').trim();
    const data = JSON.parse(jsonString);

    return res.status(200).json(data);

  } catch (error: any) {
    console.error("Error en API Recommend:", error);
    return res.status(500).json({ error: "No se pudo generar la recomendación", details: error.message });
  }
}