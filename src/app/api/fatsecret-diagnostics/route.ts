import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdmin } from "@/lib/api/firebase-admin";
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from "@/lib/api/cors-utils";
import { safeLog } from "@/lib/api/utils/shared-logic";

// Initialize Firebase Admin
initFirebaseAdmin();

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

/**
 * API endpoint to diagnose FatSecret connectivity issues
 * Access via: GET /api/fatsecret-diagnostics
 * 
 * Requires: Firebase Auth token in Authorization header
 * 
 * Returns:
 * - credentialsConfigured: boolean (whether FatSecret credentials are set)
 * - status: 'healthy' | 'unhealthy' | 'error'
 */
export async function GET(request: NextRequest) {
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
    console.warn("[FatSecret Diagnostics] Invalid auth token");
    return NextResponse.json(
      { error: "Invalid auth token" },
      { status: 401, headers }
    );
  }

  try {
    safeLog("log", "[API] FatSecret diagnostics requested");
    
    // Only check if credentials are configured - no sensitive details
    const hasKey = !!process.env.FATSECRET_KEY;
    const hasSecret = !!process.env.FATSECRET_SECRET;
    const credentialsConfigured = hasKey && hasSecret;
    
    return NextResponse.json(
      {
        status: credentialsConfigured ? 'configured' : 'missing_credentials',
        credentialsConfigured,
        timestamp: new Date().toISOString(),
      },
      { headers }
    );
  } catch (error: any) {
    console.error('[API] Diagnostics error:', error);
    return NextResponse.json(
      {
        status: 'error',
        credentialsConfigured: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers }
    );
  }
}