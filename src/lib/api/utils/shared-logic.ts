import { logger } from "../../../utils/logger";

/**
 * 🛠️ Sanitiza errores para no exponer datos sensibles en logs
 */
export const sanitizeError = (
    error: any,
): { message: string; code?: string; safeToLog: boolean } => {
    const errorMessage = error?.message || String(error);

    // Detectar errores que pueden contener datos sensibles
    const sensitivePatterns = [
        /api[_-]?key/i,
        /token/i,
        /password/i,
        /secret/i,
        /credential/i,
        /firebase/i,
    ];

    const hasSensitiveData = sensitivePatterns.some((pattern) =>
        pattern.test(errorMessage),
    );

    if (hasSensitiveData) {
        return {
            message: "Error sanitizado: contiene datos sensibles",
            code: error?.code,
            safeToLog: false,
        };
    }

    return {
        message: errorMessage.substring(0, 500), // Limitar longitud
        code: error?.code,
        safeToLog: true,
    };
};

/**
 * 🛠️ Logger seguro que respeta el entorno
 */
export const safeLog = (
    level: "log" | "error" | "warn",
    message: string,
    error?: any,
) => {
    const isDev = process.env.NODE_ENV === "development";

    if (error) {
        const sanitized = sanitizeError(error);
        if (sanitized.safeToLog || isDev) {
            console[level](message, isDev ? error : sanitized.message);
        } else {
            console[level](message, "[Error sanitizado - ver logs seguros]");
        }
    } else {
        console[level](message);
    }
};

/**
 * 🛠️ Normaliza texto retirando acentos y convirtiendo a minúsculas
 */
export const normalizeText = (text: string): string =>
    text
        ? text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
        : "";

/**
 * 🛠️ Obtiene la raíz de una palabra (simplificado)
 */
export const getRootWord = (text: string): string => {
    let clean = normalizeText(text);
    if (clean.length <= 3) return clean;
    if (clean.endsWith("ces")) return clean.slice(0, -3) + "z";
    if (clean.endsWith("es")) return clean.slice(0, -2);
    if (clean.endsWith("s")) return clean.slice(0, -1);
    return clean;
};

/**
 * 🛠️ Crea un patrón regex para búsqueda flexible (ignora acentos)
 */
export const createRegexPattern = (text: string): string => {
    const root = getRootWord(text);
    return root
        .replace(/a/g, "[aáàäâ]")
        .replace(/e/g, "[eéèëê]")
        .replace(/i/g, "[iíìïî]")
        .replace(/o/g, "[oóòöô]")
        .replace(/u/g, "[uúùüû]");
};

/**
 * 🛠️ Asegura que la entrada sea un array de strings
 */
export const ensureArray = (input: any): string[] => {
    if (!input) return [];
    if (Array.isArray(input))
        return input.filter((i): i is string => typeof i === "string");
    if (typeof input === "string")
        return input
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    return [];
};

export const RECIPE_JSON_TEMPLATE = `{
  "saludo_personalizado": "string",
  "receta": {
    "recetas": [
      {
        "id": number,
        "titulo": "string",
        "tiempo_estimado": "string",
        "dificultad": "Fácil|Media|Difícil",
        "coincidencia_despensa": "string",
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
}`;

export const RESTAURANT_JSON_TEMPLATE = `{
  "saludo_personalizado": "string",
  "ubicacion_detectada": "string",
  "recomendaciones": [
    {
      "id": number,
      "nombre_restaurante": "string",
      "tipo_comida": "string",
      "direccion_aproximada": "string",
      "plato_sugerido": "string",
      "por_que_es_bueno": "string",
      "hack_saludable": "string"
    }
  ]
}`;

/**
 * 🛠️ Limpia objetos para Firestore, convirtiendo undefined a null
 */
export function cleanForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    // Preserve Firestore-native types and Date instances
    if (obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
        return obj.map(v => cleanForFirestore(v)).filter(v => v !== undefined);
    }

    if (typeof obj === 'object') {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
            const val = cleanForFirestore(obj[key]);
            if (val !== undefined) cleaned[key] = val;
        });
        return cleaned;
    }
    return obj;
}
