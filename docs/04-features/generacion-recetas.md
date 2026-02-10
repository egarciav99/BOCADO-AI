# 🍳 Feature: Generación de Recetas con IA

## Descripción

El core de la app. Usa Google Gemini para generar recetas personalizadas basadas en el perfil del usuario y sus preferencias.

## Componentes

| Componente | Ubicación |
|------------|-----------|
| `RecommendationScreen` | `components/RecommendationScreen.tsx` |
| `MealCard` | `components/MealCard.tsx` |
| `ConfirmationScreen` | `components/ConfirmationScreen.tsx` |
| `FeedbackModal` | `components/FeedbackModal.tsx` |

## User Flow

```
Home → Seleccionar tipo de comida 
     → (Opcional) Elegir ingredientes de despensa
     → Generar → Loading state
     → Ver receta → Guardar / Descartar / Modificar
```

## Prompt Engineering

### Estructura del Prompt

```typescript
const recipePrompt = `
Eres un nutricionista experto. Crea una receta personalizada para:

PERFIL DEL USUARIO:
- Edad: ${user.age} años
- Género: ${user.gender}
- Peso: ${user.weight}kg, Altura: ${user.height}cm
- Nivel de actividad: ${user.activityLevel}
- Objetivo: ${user.goal}
- Condiciones médicas: ${user.medicalConditions.join(', ')}
- Alergias: ${user.allergies.join(', ')}
- Preferencias: ${user.dietaryPreferences.join(', ')}
- No le gusta: ${user.dislikedFoods.join(', ')}

REQUERIMIENTOS:
- Tipo de comida: ${mealType}
- Tiempo máximo: ${user.cookingTimePreference}
- Ingredientes disponibles: ${pantryItems.join(', ')}

FORMATO DE RESPUESTA (JSON):
{
  "title": "string",
  "description": "string",
  "cuisine": "string",
  "cookingTime": number,
  "difficulty": "easy|medium|hard",
  "servings": number,
  "ingredients": [
    { "name": "string", "amount": number, "unit": "string", "category": "string" }
  ],
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "instructions": ["string"],
  "tips": ["string"]
}
`;
```

## API Endpoint

```typescript
// POST /api/generate-recipe
interface GenerateRecipeRequest {
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  usePantryItems?: boolean;
  extraPrompt?: string; // "Quiero algo con pollo"
}

interface GenerateRecipeResponse {
  recipe: Recipe;
  tokensUsed: number;
}
```

## Manejo de Errores

| Error | Mensaje al usuario | Acción |
|-------|-------------------|--------|
| Gemini timeout | "Estoy tardando más de lo esperado..." | Retry automático |
| JSON inválido | "Ups, no entendí bien la receta" | Regenerar |
| Límite de rate | "Has generado muchas recetas hoy" | Mostrar cooldown |
| Alergia no respetada | (Interno) Re-prompt con énfasis | Regenerar con warning |

## Optimizaciones

- [ ] Cache de recetas similares
- [ ] Pre-generar 3 recetas en background
- [ ] Feedback loop: rating de recetas mejora prompts futuros

## Métricas

- Tiempo promedio de generación
- Tasa de "me gusta" vs "descartar"
- Recetas guardadas / generadas
- Tokens consumidos por receta
