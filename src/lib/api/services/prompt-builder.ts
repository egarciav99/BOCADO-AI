import { ensureArray, RECIPE_JSON_TEMPLATE, RESTAURANT_JSON_TEMPLATE } from "../utils/shared-logic";

export interface PromptOptions {
    type: "En casa" | "Fuera";
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
     * 🛡️ Escapa strings de usuario para prevenir prompt injection básico.
     */
    static escapeUserInput(input: string): string {
        if (!input) return "";
        return input.replace(/[<>#$]/g, "").slice(0, 200);
    }
}
