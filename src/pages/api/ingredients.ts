/**
 * GET /api/ingredients
 * 
 * Devuelve lista de ingredientes disponibles para autocomplete en Receta Rápida.
 * Cache: 1 hora (ingredientes son relativamente estáticos)
 * 
 * Requires: Firebase Auth token in Authorization header
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "../../lib/api/firebase-admin";
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from "../../lib/api/cors-utils";

const adminApp = initFirebaseAdmin();
const db = adminApp ? getFirestore() : null;

// Simple in-memory cache (TTL: 1 hora)
let ingredientsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    return res.status(500).json({ error: "Firebase not initialized" });
  }

  // CORS headers with origin validation
  const origin = req.headers.origin as string | undefined;
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS_LIST[0];
  
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || ALLOWED_ORIGINS_LIST[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only GET is allowed
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Validate Firebase Auth token
  const authHeader = req.headers.authorization || "";
  const tokenMatch = typeof authHeader === "string" 
    ? authHeader.match(/^Bearer\s+(.+)$/i) 
    : null;
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  try {
    await getAuth().verifyIdToken(idToken);
  } catch (err) {
    console.warn("[Ingredients] Invalid auth token");
    return res.status(401).json({ error: "Invalid auth token" });
  }

  try {
    // Verificar caché
    const now = Date.now();
    if (ingredientsCache && now - cacheTimestamp < CACHE_TTL_MS) {
      console.log("[Ingredients] Cache HIT");
      return res.status(200).json({ ingredients: ingredientsCache });
    }

    // Fetch de Firestore
    console.log("[Ingredients] Cache MISS, fetching from Firestore...");
    const snap = await db.collection("ingredients").limit(1000).get();

    if (snap.empty) {
      console.warn("[Ingredients] No ingredients found in Firestore");
      // Cache the empty result to avoid repeated Firestore queries
      ingredientsCache = [];
      cacheTimestamp = now;
      return res.status(200).json({ ingredients: [] });
    }

    const ingredients = snap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "",
      regional: doc.data().regional || {},
    }));

    // Actualizar caché
    ingredientsCache = ingredients;
    cacheTimestamp = now;

    console.log(`[Ingredients] Fetched ${ingredients.length} ingredients`);
    return res.status(200).json({ ingredients });
  } catch (error: any) {
    console.error("[Ingredients] Error:", error);
    return res.status(500).json({
      error: "Error fetching ingredients",
    });
  }
}
