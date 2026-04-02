/**
 * GET /api/ingredients
 * 
 * Devuelve lista de ingredientes disponibles para autocomplete en Receta Rápida.
 * Cache: 1 hora (ingredientes son relativamente estáticos)
 * 
 * Requires: Firebase Auth token in Authorization header
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin } from "@/lib/api/firebase-admin";
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from "@/lib/api/cors-utils";

const adminApp = initFirebaseAdmin();
const db = adminApp ? getFirestore() : null;

// Simple in-memory cache (TTL: 1 hora)
let ingredientsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// ============================================
// CORS HELPER
// ============================================

function corsHeaders(origin: string | null) {
  const originStr = origin || undefined;
  const allowedOrigin = isOriginAllowed(originStr) ? (originStr || ALLOWED_ORIGINS_LIST[0]) : ALLOWED_ORIGINS_LIST[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ============================================
// HTTP HANDLERS
// ============================================

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function GET(request: NextRequest) {
  if (!db) {
    const origin = request.headers.get("origin");
    return NextResponse.json(
      { error: "Firebase not initialized" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  // Validate Firebase Auth token
  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401, headers }
    );
  }

  try {
    await getAuth().verifyIdToken(idToken);
  } catch (err) {
    console.warn("[Ingredients] Invalid auth token");
    return NextResponse.json(
      { error: "Invalid auth token" },
      { status: 401, headers }
    );
  }

  try {
    // Verificar caché
    const now = Date.now();
    if (ingredientsCache && now - cacheTimestamp < CACHE_TTL_MS) {
      console.log("[Ingredients] Cache HIT");
      return NextResponse.json(
        { ingredients: ingredientsCache },
        { headers }
      );
    }

    // Fetch de Firestore
    console.log("[Ingredients] Cache MISS, fetching from Firestore...");
    const snap = await db.collection("ingredients").limit(1000).get();

    if (snap.empty) {
      console.warn("[Ingredients] No ingredients found in Firestore");
      // Cache the empty result to avoid repeated Firestore queries
      ingredientsCache = [];
      cacheTimestamp = now;
      return NextResponse.json(
        { ingredients: [] },
        { headers }
      );
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
    return NextResponse.json(
      { ingredients },
      { headers }
    );
  } catch (error: any) {
    console.error("[Ingredients] Error:", error);
    return NextResponse.json(
      {
        error: "Error fetching ingredients",
      },
      { status: 500, headers }
    );
  }
}