import { NextRequest, NextResponse } from "next/server";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initFirebaseAdmin } from "@/lib/api/firebase-admin";
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from "@/lib/api/cors-utils";
import {
  profileCache,
  pantryCache,
  historyCache,
  getCacheStats,
} from "@/lib/api/utils/cache";

const adminApp = initFirebaseAdmin();

// ============================================
// CORS HELPER
// ============================================

function corsHeaders(origin: string | null) {
  const originStr = origin || undefined;
  const allowedOrigin = isOriginAllowed(originStr) ? (originStr || ALLOWED_ORIGINS_LIST[0]) : ALLOWED_ORIGINS_LIST[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
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

// ============================================
// GET: Cache stats (dev or api-key protected)
// ============================================
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const originStr = origin || undefined;
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(originStr)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  try {
    const isDev = process.env.NODE_ENV === "development";
    const providedKey = request.headers.get("x-api-key");
    const expectedKey = process.env.CACHE_STATS_KEY;
    const hasValidKey = Boolean(
      expectedKey && providedKey && providedKey === expectedKey,
    );

    if (!isDev && !hasValidKey) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers }
      );
    }

    const stats = getCacheStats();
    return NextResponse.json(
      { stats, timestamp: new Date().toISOString() },
      { headers }
    );
  } catch (error: any) {
    console.error("[Cache] Stats error:", error);
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500, headers }
    );
  }
}

// ============================================
// POST: Invalidate cache (requires Firebase auth)
// ============================================
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const originStr = origin || undefined;
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(originStr)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  // Autenticar con Firebase Auth token
  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return NextResponse.json(
      { error: "Auth token required" },
      { status: 401, headers }
    );
  }

  let userId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    userId = decoded.uid;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid auth token" },
      { status: 401, headers }
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional for this endpoint
    }

    const { type = "all" } = body;
    const invalidated: string[] = [];

    switch (type) {
      case "profile":
        profileCache.del(userId);
        invalidated.push("profile");
        break;
      case "pantry":
        pantryCache.del(userId);
        invalidated.push("pantry");
        break;
      case "history":
        historyCache.del(userId);
        invalidated.push("history");
        break;
      case "all":
      default:
        profileCache.del(userId);
        pantryCache.del(userId);
        historyCache.del(userId);
        invalidated.push("profile", "pantry", "history");
        break;
    }

    console.log(
      `[Cache] Invalidated ${invalidated.join(", ")} for user ${userId.substring(0, 8)}...`,
    );

    return NextResponse.json(
      {
        success: true,
        userId: userId.substring(0, 8) + "...",
        invalidated,
        timestamp: new Date().toISOString(),
      },
      { headers }
    );
  } catch (error: any) {
    console.error("[Cache] Invalidation error:", error);
    return NextResponse.json(
      { error: "Failed to invalidate cache" },
      { status: 500, headers }
    );
  }
}