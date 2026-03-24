/**
 * Validation Middleware
 * Centralized validation logic for API endpoints
 * - CORS handling
 * - Rate limiting (IP + User)
 * - Authentication
 * - Request body validation
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { safeLog } from '../utils/shared-logic';

// CORS Configuration
const ALLOWED_ORIGINS = [
  // Producción
  "https://bocado-ai.vercel.app",
  "https://bocado.app", 
  "https://www.bocado.app",
  "https://app.bocado.app",
  // Desarrollo
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

// ==========================================
// CORS & Origin Validation
// ==========================================

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin requests
  return ALLOWED_ORIGINS.some((allowed: string) => {
    if (allowed === "*") return true;
    if (allowed.endsWith("*")) {
      const baseUrl = allowed.slice(0, -1);
      return origin.startsWith(baseUrl);
    }
    return origin === allowed;
  });
}

export function handleCORS(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin;

  // Verificar origen permitido
  if (!isOriginAllowed(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return false;
  }

  // Si no hay origin (same-origin), usar el primer origen de producción
  const allowedOrigin = origin || ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }

  return true;
}

// ==========================================
// Authentication
// ==========================================

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function validateAuthToken(req: NextApiRequest): Promise<AuthResult> {
  const authHeader =
    req.headers?.authorization || req.headers?.Authorization || "";
  const tokenMatch =
    typeof authHeader === "string"
      ? authHeader.match(/^Bearer\s+(.+)$/i)
      : null;
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return { success: false, error: "Auth token requerido" };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { success: true, userId: decoded.uid };
  } catch (err) {
    safeLog("error", "Auth token verification failed:", err);
    return { success: false, error: "Auth token inválido" };
  }
}

// ==========================================
// Request Body Validation
// ==========================================

// Zod schemas for common request types
export const RecommendationRequestSchema = z.object({
  userId: z.string().min(1, "userId es requerido"),
  type: z.enum(["En casa", "Fuera", "Receta Rápida"]),
  mealType: z.string().max(50).optional().nullable(),
  ingredientes: z.array(z.string().min(1, "Ingrediente no puede estar vacío")),
  cookingTime: z.number().nullable(),
  cravings: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  dislikedFoods: z.array(z.string()),
  onlyPantryIngredients: z.boolean(),
  language: z.enum(["es", "en"]),
  context: z.string().optional(),
  budget: z.string().optional(),
  currency: z.string().optional(),
  _id: z.string().optional(),
  userLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
  }).nullable().optional(),
});

export type ValidatedRecommendationRequest = z.infer<typeof RecommendationRequestSchema>;

export function validateRequestBody<T>(
  body: any,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(", ");
      return { success: false, error: `Validación falló: ${errorMessage}` };
    }
    return { success: false, error: "Error de validación desconocido" };
  }
}