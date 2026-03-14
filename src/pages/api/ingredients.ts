/**
 * GET /api/ingredients
 * 
 * Devuelve lista de ingredientes disponibles para autocomplete en Receta Rápida.
 * Cache: 1 hora (ingredientes son relativamente estáticos)
 */

import { getFirestore } from "firebase-admin/firestore";
import { getApps, cert, initializeApp } from "firebase-admin/app";

// Firebase Admin Init
const getAdminApp = () => {
  if (getApps().length > 0) return getApps()[0];
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no definida");
    const serviceAccount = JSON.parse(serviceAccountKey.trim());
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("❌ Error Firebase Admin Init:", error);
    return null;
  }
};

const adminApp = getAdminApp();
const db = adminApp ? getFirestore() : null;

// Simple in-memory cache (TTL: 1 hora)
let ingredientsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

export default async function handler(req: any, res: any) {
  if (!db) {
    return res.status(500).json({ error: "Firebase not initialized" });
  }

  try {
    // CORS headers - ALWAYS SET before method checks
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS preflight requests before method validation
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    // Only GET is allowed from here
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método no permitido" });
    }

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
