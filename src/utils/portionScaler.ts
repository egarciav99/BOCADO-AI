// Utilidad inteligente para escalar ingredientes de recetas
// Evita desperdicio usando factores de escala diferenciados por categoría

// ============================================
// TIPOS Y CONFIGURACIÓN
// ============================================

export interface ScaledIngredient {
  original: string;
  scaled: string;
  factor: number; // Factor real aplicado (para debugging)
  category: IngredientCategory;
}

export type IngredientCategory =
  | "protein" // Carnes, pescados, huevos, legumbres (escala lineal)
  | "carb" // Arroz, pasta, papas, cereales (escala casi lineal)
  | "vegetable" // Vegetales frescos (escala ~70%)
  | "aromatic" // Cebolla, ajo, hierbas frescas (mínimo práctico)
  | "spice" // Especias, condimentos, sal, pimienta (casi no escala)
  | "liquid" // Caldos, agua, leche, aceite (escala adaptativa)
  | "dairy" // Quesos, yogur, crema (escala moderada)
  | "other"; // Otros ingredientes

interface ScalingConfig {
  factor: number; // Factor de escala base (0-1 = escala menos, 1+ = escala más)
  minIncrement: number; // Mínimo incremento permitido
  roundUp: boolean; // Redondear hacia arriba o abajo
}

// Configuración de escalado por categoría
const SCALING_CONFIG: Record<IngredientCategory, ScalingConfig> = {
  protein: { factor: 1.0, minIncrement: 0.5, roundUp: true }, // Escala lineal (necesitas más proteína)
  carb: { factor: 0.9, minIncrement: 0.25, roundUp: true }, // Escala un poco menos (la gente come menos carb proporcionalmente)
  vegetable: { factor: 0.75, minIncrement: 0.5, roundUp: false }, // Escala 75% (optimización principal)
  aromatic: { factor: 0.5, minIncrement: 0.5, roundUp: false }, // Mínimo práctico (1 cebolla rinde para más)
  spice: { factor: 0.3, minIncrement: 0.25, roundUp: false }, // Casi no escala (el sabor se concentra)
  liquid: { factor: 0.85, minIncrement: 0.25, roundUp: false }, // Un poco menos de líquido
  dairy: { factor: 0.85, minIncrement: 0.25, roundUp: false }, // Moderado
  other: { factor: 0.8, minIncrement: 0.25, roundUp: false }, // Default conservador
};

// Palabras clave para categorizar ingredientes
const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  protein: [
    "pollo",
    "pechuga",
    "muslo",
    "alita",
    "pavo",
    "pata",
    "carne",
    "res",
    "cerdo",
    "chuleta",
    "pescado",
    "pesca",
    "salmón",
    "atún",
    "merluza",
    "bacalao",
    "filete",
    "filete",
    "huevo",
    "huevos",
    "huevo",
    "clara",
    "yema",
    "tofu",
    "tempeh",
    "seitán",
    "proteína",
    "lenteja",
    "garbanzo",
    "frijol",
    "poroto",
    "alubia",
    "haba",
    "jamón",
    "tocino",
    "chorizo",
    "salchicha",
    "morcilla",
    "embutido",
  ],
  carb: [
    "arroz",
    "pasta",
    "fideo",
    "espagueti",
    "macarrón",
    "lasaña",
    "ñoqui",
    "gnocchi",
    "papa",
    "patata",
    "camote",
    "batata",
    "yuca",
    "ñame",
    "plátano macho",
    "plátano",
    "pan",
    "tortilla",
    "arepa",
    "tostada",
    "pan",
    "baguette",
    "avena",
    "quinoa",
    "cebada",
    "trigo",
    "maíz",
    "harina",
  ],
  vegetable: [
    "tomate",
    "jitomate",
    "lechuga",
    "espinaca",
    "acelga",
    "kale",
    "col",
    "repollo",
    "berza",
    "zanahoria",
    "pepino",
    "calabacín",
    "calabaza",
    "berenjena",
    "pimiento",
    "chile",
    "ají",
    "brócoli",
    "coliflor",
    "espárrago",
    "judía",
    "ejote",
    "chicharo",
    "guisante",
    "champiñón",
    "hongo",
    "seta",
    "palmito",
    "alcachofa",
    "apio",
    "rábano",
    "nabo",
    "aguacate",
    "palta",
    "remolacha",
    "betabel",
    "puerro",
    "puerro",
  ],
  aromatic: [
    "cebolla",
    "ajo",
    "chalote",
    "cebollín",
    "cebollita",
    "puerro",
    "apio",
    "perejil",
    "cilantro",
    "albahaca",
    "menta",
    "romero",
    "tomillo",
    "orégano",
    "laurel",
    "jengibre",
    "cúrcuma",
    "raíz",
    "hierba",
    "hoja",
  ],
  spice: [
    "sal",
    "pimienta",
    "comino",
    "canela",
    "clavo",
    "nuez moscada",
    "pimentón",
    "paprika",
    "cayena",
    "chil",
    "picante",
    "orégano seco",
    "tomillo seco",
    "romero seco",
    "azafrán",
    "cárdamo",
    "cilantro seco",
    "comino",
    "cúrcuma",
    "curry",
    "masala",
    "condimento",
    "especia",
    "mezcla",
    "adobo",
    "sazonador",
    "caldo",
    "consomé",
    "vainilla",
    "extracto",
    "esencia",
  ],
  liquid: [
    "agua",
    "caldo",
    "consomé",
    "leche",
    "crema",
    "nata",
    "yogur",
    "kefir",
    "aceite",
    "vinagre",
    "jugo",
    "zumo",
    "limón",
    "lime",
    "naranja",
    "vino",
    "cerveza",
    "licor",
    "alcohol",
    "salsa de soya",
    "salsa soya",
    "salsa inglesa",
    "aceite de oliva",
    "aceite de coco",
    "mantequilla derretida",
  ],
  dairy: [
    "queso",
    "mozzarella",
    "parmesano",
    "cheddar",
    "feta",
    "crema",
    "nata",
    "mantequilla",
    "margarina",
    "yogur",
    "yogurt",
    "leche",
    "leche evaporada",
    "leche condensada",
  ],
  other: [],
};

// Ingredientes que requieren mínimos específicos
const MINIMUMS: Record<string, number> = {
  huevo: 1,
  huevos: 1,
  cebolla: 0.5,
  cebollas: 0.5,
  "diente de ajo": 1,
  "dientes de ajo": 1,
  "cabza de ajo": 0.5,
  "cabezas de ajo": 0.5,
  limón: 0.5,
  limones: 0.5,
  lima: 0.5,
  limas: 0.5,
  tomate: 0.5,
  tomates: 0.5,
  jitomate: 0.5,
  jitomates: 0.5,
};

// ============================================
// FUNCIONES DE DETECCIÓN
// ============================================

/**
 * Detecta la categoría de un ingrediente basado en palabras clave
 */
function detectCategory(ingredient: string): IngredientCategory {
  const lower = ingredient.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Palabra completa o al inicio del string
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(lower)) {
        return category as IngredientCategory;
      }
    }
  }

  return "other";
}

/**
 * Extrae el número al inicio de un string de ingrediente
 * Maneja: "2", "2.5", "1/2", "½", "1 ½" (mixto)
 */
function extractNumber(text: string): {
  value: number;
  hasNumber: boolean;
  rest: string;
} {
  const trimmed = text.trim();

  // Fracciones Unicode
  const fractions: Record<string, number> = {
    "½": 0.5,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "¼": 0.25,
    "¾": 0.75,
    "⅕": 0.2,
    "⅖": 0.4,
    "⅗": 0.6,
    "⅘": 0.8,
    "⅙": 1 / 6,
    "⅚": 5 / 6,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
  };

  // Número mixto: "1 ½" o "1½"
  const mixedMatch = trimmed.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*(.*)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const frac = fractions[mixedMatch[2]] || 0;
    return { value: whole + frac, hasNumber: true, rest: mixedMatch[3].trim() };
  }

  // Fracción Unicode sola
  for (const [char, value] of Object.entries(fractions)) {
    if (trimmed.startsWith(char)) {
      return {
        value,
        hasNumber: true,
        rest: trimmed.slice(char.length).trim(),
      };
    }
  }

  // Fracción con slash (1/2, 3/4, 10/3, etc)
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)(\s*.*)$/);
  if (fractionMatch) {
    return {
      value: parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]),
      hasNumber: true,
      rest: fractionMatch[3].trim(),
    };
  }

  // Número decimal o entero
  const numberMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (numberMatch) {
    return {
      value: parseFloat(numberMatch[1]),
      hasNumber: true,
      rest: numberMatch[2].trim(),
    };
  }

  // Sin número (ej: "Sal al gusto")
  return { value: 0, hasNumber: false, rest: trimmed };
}

/**
 * Detecta si un ingrediente tiene un mínimo específico
 */
function detectMinimum(ingredient: string): number | null {
  const lower = ingredient.toLowerCase();
  for (const [key, min] of Object.entries(MINIMUMS)) {
    if (lower.includes(key)) {
      return min;
    }
  }
  return null;
}

// ============================================
// FUNCIONES DE FORMATEO
// ============================================

/**
 * Formatea un número a string legible
 * Usa fracciones Unicode cuando es apropiado
 */
function formatNumber(num: number, category: IngredientCategory): string {
  // Aplicar mínimo práctico
  const min =
    detectMinimum("placeholder") || SCALING_CONFIG[category].minIncrement;
  if (num > 0 && num < min) {
    num = min;
  }

  // Si es entero, devolver como entero
  if (Number.isInteger(num)) {
    return num.toString();
  }

  // Redondear según configuración
  const config = SCALING_CONFIG[category];
  const decimals = config.minIncrement < 0.5 ? 1 : 0;
  num = config.roundUp
    ? Math.ceil(num / config.minIncrement) * config.minIncrement
    : Math.round(num / config.minIncrement) * config.minIncrement;

  // Fracciones Unicode comunes
  const tolerance = 0.02;
  const fractions: [number, string][] = [
    [0.25, "¼"],
    [0.5, "½"],
    [0.75, "¾"],
    [1 / 3, "⅓"],
    [2 / 3, "⅔"],
  ];

  const whole = Math.floor(num);
  const decimal = num - whole;

  for (const [value, symbol] of fractions) {
    if (Math.abs(decimal - value) < tolerance) {
      return whole > 0 ? `${whole} ${symbol}` : symbol;
    }
  }

  // Default: decimal con 1 o 2 decimales
  return num.toFixed(decimals).replace(/\.0$/, "");
}

// ============================================
// FUNCIÓN PRINCIPAL DE ESCALADO
// ============================================

export interface ScaleOptions {
  baseServings: number;
  targetServings: number;
  respectMinimums?: boolean;
}

/**
 * Escala un ingrediente de forma inteligente según su categoría
 * Evita desperdicio usando factores de escala diferenciados
 *
 * @example
 * scaleIngredient('2 cebollas', { baseServings: 2, targetServings: 4 })
 * // Resultado: "3 cebollas" (no 4, porque las cebollas escalan al 75%)
 */
export function scaleIngredient(
  ingredient: string,
  options: ScaleOptions,
): ScaledIngredient {
  const { baseServings, targetServings, respectMinimums = true } = options;

  // Si no hay cambio de porciones, devolver igual
  if (baseServings === targetServings) {
    return {
      original: ingredient,
      scaled: ingredient,
      factor: 1,
      category: detectCategory(ingredient),
    };
  }

  const category = detectCategory(ingredient);
  const extracted = extractNumber(ingredient);

  // Sin número detectado (ej: "Sal al gusto")
  if (!extracted.hasNumber) {
    return {
      original: ingredient,
      scaled: ingredient,
      factor: 1,
      category,
    };
  }

  // Calcular multiplicador base de porciones
  const portionMultiplier = targetServings / baseServings;

  // Aplicar factor de categoría (para evitar desperdicio)
  const config = SCALING_CONFIG[category];

  // Fórmula inteligente: combina multiplicador de porciones con factor de categoría
  // Para porciones mayores, el factor de categoría reduce más el desperdicio
  const adaptiveFactor = 1 + (portionMultiplier - 1) * config.factor;

  const newValue = extracted.value * adaptiveFactor;

  // Aplicar mínimos si corresponde
  let finalValue = newValue;
  if (respectMinimums) {
    const specificMin = detectMinimum(extracted.rest);
    const minValue = specificMin || config.minIncrement;

    // Redondear según configuración
    if (config.roundUp) {
      finalValue = Math.ceil(newValue / minValue) * minValue;
    } else {
      finalValue = Math.round(newValue / minValue) * minValue;
    }

    // Asegurar mínimo absoluto
    if (finalValue < minValue && newValue > 0) {
      finalValue = minValue;
    }
  }

  const formattedValue = formatNumber(finalValue, category);
  const scaled = `${formattedValue} ${extracted.rest}`.trim();

  return {
    original: ingredient,
    scaled,
    factor: adaptiveFactor,
    category,
  };
}

/**
 * Escala un array de ingredientes de forma inteligente
 */
export function scaleIngredients(
  ingredients: string[],
  options: ScaleOptions,
): ScaledIngredient[] {
  return ingredients.map((ing) => scaleIngredient(ing, options));
}

/**
 * Versión simple que devuelve solo los strings escalados
 */
export function scaleIngredientsSimple(
  ingredients: string[],
  options: ScaleOptions,
): string[] {
  return ingredients.map((ing) => scaleIngredient(ing, options).scaled);
}

// ============================================
// OPCIONES DE PORCIONES (UI)
// ============================================

export const PORTION_OPTIONS = [
  { value: 1, label: "1 persona", icon: "👤" },
  { value: 2, label: "2 personas", icon: "👥" },
  { value: 3, label: "3 personas", icon: "👨‍👩‍👧" },
  { value: 4, label: "4 personas", icon: "👨‍👩‍👧‍👦" },
  { value: 5, label: "5 personas", icon: "👨‍👩‍👧‍👧" },
  { value: 6, label: "6 personas", icon: "🏠" },
  { value: 8, label: "8 personas", icon: "🎉" },
] as const;

// ============================================
// UTILIDADES LEGACY (para compatibilidad)
// ============================================

/**
 * @deprecated Use scaleIngredient con ScaleOptions en su lugar
 */
export function calculateMultiplier(
  baseServings: number,
  targetServings: number,
): number {
  if (baseServings <= 0 || targetServings <= 0) return 1;
  return targetServings / baseServings;
}

/**
 * @deprecated Use scaleIngredientsSimple con ScaleOptions en su lugar
 */
export function scaleIngredientsLegacy(
  ingredients: string[],
  multiplier: number,
): string[] {
  // Asume base de 2 porciones
  const baseServings = 2;
  const targetServings = Math.round(baseServings * multiplier);
  return scaleIngredientsSimple(ingredients, { baseServings, targetServings });
}

/**
 * Detecta porciones base de una receta
 */
export function detectBaseServings(recipe: {
  ingredients?: string[];
  title?: string;
}): number {
  // Podríamos parsear el título para detectar "para 4 personas"
  // Por ahora, default a 2
  return 2;
}
