import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdmin } from "../../lib/api/firebase-admin";
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from "../../lib/api/cors-utils";

// Initialize Firebase Admin
initFirebaseAdmin();

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
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers with origin validation
  const origin = req.headers.origin as string | undefined;
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS_LIST[0];
  
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || ALLOWED_ORIGINS_LIST[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    console.warn("[FatSecret Diagnostics] Invalid auth token");
    return res.status(401).json({ error: "Invalid auth token" });
  }

  try {
    console.log('[API] FatSecret diagnostics requested');
    
    // Only check if credentials are configured - no sensitive details
    const hasKey = !!process.env.FATSECRET_KEY;
    const hasSecret = !!process.env.FATSECRET_SECRET;
    const credentialsConfigured = hasKey && hasSecret;
    
    res.status(200).json({
      status: credentialsConfigured ? 'configured' : 'missing_credentials',
      credentialsConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Diagnostics error:', error);
    res.status(500).json({
      status: 'error',
      credentialsConfigured: false,
      timestamp: new Date().toISOString(),
    });
  }
}
