import { ensureArray, RECIPE_JSON_TEMPLATE, RESTAURANT_JSON_TEMPLATE } from "../utils/shared-logic";

export interface PromptOptions {
    type: "En casa" | "Fuera" | "Receta Rápida";
    mealType?: string;
    cookingTime?: number;
    dietaryGoal?: string;
    medicalContext?: string;
    dislikedFoodsContext?: string;
    historyContext?: string;
    feedbackContext?: string;
    pantryContext?: string;
    marketList?: string;
    onlyPantryIngredients?: boolean;
    city?: string;
    country?: string;
    language?: string;
    difficultyHint?: string;
    pantryRule?: string;
    constraints?: string[];
    // ✅ NUEVO: Para Receta Rápida
    ingredientes?: string[];
}

/**
 * 🛠️ Construye prompts para Gemini con medidas anti-inyección.
 */
export class PromptBuilder {
    static buildRecipePrompt(options: PromptOptions): string {
        const {
            dietaryGoal,
            medicalContext,
            dislikedFoodsContext,
            city,
            country,
            mealType,
            cookingTime,
            historyContext,
            feedbackContext,
            pantryContext,
            marketList,
            onlyPantryIngredients,
            difficultyHint,
            pantryRule,
            language,
        } = options;

        return `Eres nutricionista experto. Tu objetivo es generar exactamente 3 recetas saludables.

### CONTEXTO DEL USUARIO (NO MODIFICABLE) ###
- Objetivo: ${dietaryGoal}
- Restricciones Médicas: ${medicalContext}
- Alimentos que NO le gustan: ${dislikedFoodsContext}
- Ubicación: ${city || country || "Desconocida"}
### FIN CONTEXTO USUARIO ###

### PARÁMETROS DE LA SOLICITUD ###
- Momento: ${mealType || "Comida"}
- Tiempo máximo: ${cookingTime || 30} minutos
### FIN PARÁMETROS ###

${historyContext ? `\n### MEMORIA RECIENTE ###\n${historyContext.slice(0, 300)}\n### FIN MEMORIA ###` : ""}
${feedbackContext ? `\n### FEEDBACK DEL USUARIO ###\n${feedbackContext.slice(0, 300)}\n### FIN FEEDBACK ###` : ""}

### DISPONIBILIDAD DE INGREDIENTES ###
${pantryContext ? `- DESPENSA (Priorizada): ${pantryContext}` : ""}
${marketList && !onlyPantryIngredients ? `- MERCADO (Disponible): ${marketList}` : ""}
### FIN DISPONIBILIDAD ###

### REGLAS ESTRICTAS DE GENERACIÓN ###
1. Genera EXACTAMENTE 3 recetas.
2. Tiempo de preparación ≤ ${cookingTime || 30} min.${difficultyHint}
3. ${pantryRule}
4. USA EXCLUSIVAMENTE ingredientes de las listas proporcionadas. Si no hay lista, usa básicos universales y productos comunes en ${city || country || "la región"}.
5. PROHIBIDO inventar ingredientes exóticos o difíciles de conseguir.
6. PRIORIZA ingredientes marcados como (URGENTE: Próximo a vencer) para reducir el desperdicio.
7. Las cantidades deben ser realistas.
### FIN REGLAS ###

Responde EXCLUSIVAMENTE en ${language === "en" ? "INGLÉS" : "ESPAÑOL"}.
Responde en formato JSON usando esta estructura exacta:
${RECIPE_JSON_TEMPLATE}

Personaliza el saludo_personalizado para hacerlo motivador y amable.`;
    }

    static buildRestaurantPrompt(options: PromptOptions): string {
        const {
            dietaryGoal,
            medicalContext,
            dislikedFoodsContext,
            city,
            mealType,
            language,
        } = options;

        return `Eres un guía gastronómico y nutricionista. Tu objetivo es recomendar 3 restaurantes reales o tipos de comida fuera de casa.

### PERFIL NUTRICIONAL ###
- Objetivo: ${dietaryGoal}
- Restricciones: ${medicalContext} ${dislikedFoodsContext}
### FIN PERFIL ###

### LOCALIZACIÓN ###
- Ciudad: ${city || "su ubicación actual"}
- Tipo de comida deseada: ${mealType || "Cualquiera saludable"}
### FIN LOCALIZACIÓN ###

### REGLAS ESTRICTAS ###
1. Sugiere locales reales o platos específicos saludables.
2. Explica por qué es una buena opción para su objetivo: ${dietaryGoal}.
3. Da un "hack saludable" para cada opción (ej: "pide el aderezo aparte").
4. Evita opciones que contengan alergias mencionadas.
### FIN REGLAS ###

Responde EXCLUSIVAMENTE en ${language === "en" ? "INGLÉS" : "ESPAÑOL"}.
Responde en formato JSON usando esta estructura exacta:
${RESTAURANT_JSON_TEMPLATE}

Personaliza el saludo_personalizado para hacerlo motivador y amable.`;
    }

    /**
     * � Construye prompt para Receta Rápida (1 receta con ingredientes específicos)
     */
    static buildQuickRecipePrompt(options: PromptOptions): string {
        const {
            ingredientes = [],
            dietaryGoal,
            medicalContext,
            dislikedFoodsContext,
            city,
            cookingTime,
            language,
        } = options;

        const ingredientesStr = ingredientes.join(", ");
        const ingredientesFormatted = ingredientes.length > 0 
            ? `- DISPONIBLES: ${ingredientesStr}`
            : "";

        return `Eres nutricionista experto. Tu objetivo es generar EXACTAMENTE 1 receta saludable rápida.

### CONTEXTO DEL USUARIO (NO MODIFICABLE) ###
- Objetivo: ${dietaryGoal}
- Restricciones Médicas: ${medicalContext}
- Alimentos que NO le gustan: ${dislikedFoodsContext}
- Ubicación: ${city || "Desconocida"}
### FIN CONTEXTO USUARIO ###

### INGREDIENTES DISPONIBLES (USA EXACTAMENTE ESTOS) ###
${ingredientesFormatted}
### FIN INGREDIENTES ###

### PARÁMETROS ###
${cookingTime ? `- Tiempo máximo: ${cookingTime} minutos` : "- Tiempo máximo: 20 minutos (rápida)"}
### FIN PARÁMETROS ###

### REGLAS ESTRICTAS - CRÍTICAS ###
1. Genera EXACTAMENTE 1 receta (en formato de array con 1 elemento).
2. Punto crítico: USA TODOS o casi todos los ingredientes proporcionados. Si es necesario, agrega básicos (sal, aceite) pero prioriza lo dado.
3. Respeta TODAS las restricciones médicas y alergias del usuario.
4. Excluye TODOS los alimentos en la lista "NO le gustan".
5. La receta debe ser realista y preparable con exactamente lo que el usuario tiene.
6. Las cantidades deben ser realistas para 1-2 porciones.
7. NO inventar ingredientes que no estén en la lista.
### FIN REGLAS ###

Responde EXCLUSIVAMENTE en ${language === "en" ? "INGLÉS" : "ESPAÑOL"}.
Responde en formato JSON usando esta estructura EXACTA (nota: array con 1 receta, no 3):
\`\`\`json
{
  "saludo_personalizado": "string (motivador)",
  "receta": {
    "recetas": [
      {
        "id": 1,
        "titulo": "string",
        "tiempo_estimado": "15 min" (o similar),
        "dificultad": "Fácil|Media|Difícil",
        "coincidencia_despensa": "descripción de cuántos ingredientes coinciden",
        "ingredientes": ["string"],
        "pasos_preparacion": ["string"],
        "macros_por_porcion": {
          "kcal": number,
          "proteinas_g": number,
          "carbohidratos_g": number,
          "grasas_g": number
        }
      }
    ]
  }
}
\`\`\`

Personaliza el saludo_personalizado para ser motivador con el hecho de que rápidamente genera una receta sana.`;
    }

    /**
     * �🛡️ Escapa strings de usuario para prevenir prompt injection básico.
     */
    static escapeUserInput(input: string): string {
        if (!input) return "";
        return input.replace(/[<>#$]/g, "").slice(0, 200);
    }
}
