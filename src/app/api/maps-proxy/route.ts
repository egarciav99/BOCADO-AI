/**
 * Maps API Proxy - Protege la API key de Google Maps
 *
 * TODAS las llamadas a Google Maps deben pasar por este proxy.
 * El frontend NUNCA debe tener acceso directo a la API key.
 * 
 * ✅ Fixed: Deployment issue - force rebuild 2026-03-30
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { initFirebaseAdmin } from "@/lib/api/firebase-admin";
import { isOriginAllowed } from "@/lib/api/cors-utils";
import { IPRateLimiter } from "@/lib/api/utils/ip-rate-limiter";

const adminApp = initFirebaseAdmin();
const db = adminApp ? getFirestore() : null;

// ============================================
// CONFIGURACIÓN
// ============================================
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_TIMEOUT_MS = 5000; // 5 second timeout for all Google Maps API calls

if (!GOOGLE_MAPS_API_KEY) {
  console.error("❌ GOOGLE_MAPS_API_KEY no está configurada");
}

// Rate limiting simple por IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests por minuto

// ============================================
// CORS HELPER
// ============================================

function corsHeaders(origin: string | null) {
  const originStr = origin || undefined;
  const allowedOrigin = isOriginAllowed(originStr) ? (originStr || "*") : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ============================================
// FETCH CON TIMEOUT
// ============================================

/**
 * Fetch wrapper with timeout to prevent hanging requests
 */
async function fetchWithTimeout(url: string, timeoutMs: number = GOOGLE_MAPS_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Google Maps request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// DETECCIÓN DE UBICACIÓN POR IP
// ============================================

interface IPLocationResult {
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
  timezone: string;
  isp: string;
}

/**
 * Detecta la ubicación aproximada del usuario basada en su IP.
 * Usa ipapi.co como servicio gratuito (10,000 requests/mes gratis)
 */
async function detectLocationByIP(
  ip: string,
): Promise<IPLocationResult | null> {
  // Ignorar IPs privadas/locales
  if (
    ip === "unknown" ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    console.log("[IP Detection] IP local detectada, no se puede geolocalizar");
    return null;
  }

  // Limpiar IP (quitar prefijo IPv6 si existe)
  const cleanIP = ip.replace(/^::ffff:/, "");

  try {
    // Usar ipapi.co (gratuito, no requiere API key para uso básico)
    // 3s timeout for IP lookup (not critical path)
    const response = await fetchWithTimeout(`https://ipapi.co/${cleanIP}/json/`, 3000);

    if (!response.ok) {
      console.warn(`[IP Detection] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.warn("[IP Detection] API error:", data.error);
      return null;
    }

    return {
      country: data.country_name || "",
      countryCode: data.country_code || "",
      city: data.city || "",
      lat: data.latitude,
      lng: data.longitude,
      timezone: data.timezone || "",
      isp: data.org || "",
    };
  } catch (error) {
    console.error("[IP Detection] Error:", error);
    return null;
  }
}

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

const AutocompleteSchema = z.object({
  query: z.string().min(2).max(100),
  countryCode: z.string().length(2).optional(),
});

const PlaceDetailsSchema = z.object({
  placeId: z.string().min(5).max(100),
});

const GeocodeSchema = z.object({
  address: z.string().min(3).max(200),
});

const ReverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ============================================
// CACHE SIMPLE (Firestore)
// ============================================

async function getCachedResponse(cacheKey: string): Promise<any | null> {
  try {
    const docRef = db!.collection("maps_proxy_cache").doc(cacheKey);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const data = doc.data();
    const expiresAt = data?.expiresAt?.toMillis?.() || 0;

    if (Date.now() > expiresAt) {
      // Cache expirado, eliminar
      await docRef.delete();
      return null;
    }

    return data?.response || null;
  } catch (error) {
    return null;
  }
}

async function setCachedResponse(
  cacheKey: string,
  response: any,
  ttlMinutes: number = 60,
): Promise<void> {
  try {
    const docRef = db!.collection("maps_proxy_cache").doc(cacheKey);

    // ✅ FIX: Calcular expiresAt correctamente sumando el TTL
    const now = Date.now();
    const expiresAt = new Date(now + ttlMinutes * 60 * 1000);

    await docRef.set({
      response,
      expiresAt: expiresAt, // Timestamp futuro calculado
      createdAt: FieldValue.serverTimestamp(),
      ttlMinutes: ttlMinutes, // Guardar para debugging
    });
  } catch (error) {
    // Silenciar errores de cache
  }
}

function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${prefix}_${Buffer.from(sortedParams).toString("base64").substring(0, 50)}`;
}

// ============================================
// HANDLERS DE MÉTODOS HTTP
// ============================================

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  // ✅ Enhanced logging for deployment debugging
  console.log("[maps-proxy] Handler started", {
    method: "POST",
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  if (!adminApp || !db) {
    console.error("[maps-proxy] Firebase not initialized", {
      hasAdminApp: !!adminApp,
      hasDb: !!db,
    });
    const origin = request.headers.get("origin");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Firebase not initialized." },
      { status: 503, headers: corsHeaders(origin) }
    );
  }

  const origin = request.headers.get("origin");
  const originStr = origin || undefined;

  // Debug logging to help diagnose 403 / origin issues in deployments
  try {
    const debugIP =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    
    console.info("[maps-proxy] incoming request", {
      origin: origin || null,
      method: "POST",
      url: request.url,
      clientIP: debugIP,
    });
  } catch (e) {
    // never crash on logging
  }

  // CORS
  if (!isOriginAllowed(originStr)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers: corsHeaders(origin) }
    );
  }

  // Verificar API key configurada
  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "Maps API not configured" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  // Parse body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // Rate limiting por IP
  const clientIP =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Obtener la acción antes del rate limiting para aplicar límites diferentes
  const { action, ...params } = body;
  
  // ✅ Debug logging for request body
  console.log("[maps-proxy] Request details", {
    body,
    action,
    params,
    hasBody: !!body,
    bodyType: typeof body,
  });

  // Autocomplete puede funcionar sin auth (para flujo de registro)
  // Pero con rate limiting más estricto
  const isPublicAction = action === "autocomplete";

  // Verificar autenticación (requerida para todo excepto autocomplete)
  let isAuthenticated = false;
  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = tokenMatch?.[1];

  if (idToken) {
    try {
      await getAuth().verifyIdToken(idToken);
      isAuthenticated = true;
    } catch (err) {
      if (!isPublicAction) {
        return NextResponse.json(
          { error: "Invalid auth token" },
          { status: 401, headers: corsHeaders(origin) }
        );
      }
    }
  } else if (!isPublicAction) {
    return NextResponse.json(
      { error: "Auth token required" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  // Rate limiting: usar IPRateLimiter para proteger el endpoint
  const rateLimiter = new IPRateLimiter(db!);
  const rateCheck = await rateLimiter.checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: rateCheck.secondsLeft,
      },
      { status: 429, headers: corsHeaders(origin) }
    );
  }

  try {
    const headers = corsHeaders(origin);
    
    switch (action) {
      case "autocomplete": {
        const validated = AutocompleteSchema.parse(params);
        return await handleAutocomplete(validated, headers);
      }
      case "placeDetails": {
        const validated = PlaceDetailsSchema.parse(params);
        return await handlePlaceDetails(validated, headers);
      }
      case "geocode": {
        const validated = GeocodeSchema.parse(params);
        return await handleGeocode(validated, headers);
      }
      case "reverseGeocode": {
        const validated = ReverseGeocodeSchema.parse(params);
        return await handleReverseGeocode(validated, headers);
      }
      case "detectLocation": {
        console.log("[maps-proxy] Detecting location for IP", clientIP);
        // Reusar clientIP ya declarado arriba
        const location = await detectLocationByIP(clientIP);

        if (!location) {
          console.log("[maps-proxy] Location detection failed", {
            clientIP,
            message: "No se pudo detectar la ubicación"
          });
          return NextResponse.json(
            {
              error: "No se pudo detectar la ubicación",
              fallback: true,
            },
            { status: 404, headers }
          );
        }

        console.log("[maps-proxy] Location detected successfully", {
          clientIP,
          location
        });
        return NextResponse.json(location, { headers });
      }
      default:
        console.log("[maps-proxy] Invalid action received", { 
          action, 
          availableActions: ["autocomplete", "placeDetails", "geocode", "reverseGeocode", "detectLocation"]
        });
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400, headers }
        );
    }
  } catch (error: any) {
    const headers = corsHeaders(origin);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((i) => i.message),
        },
        { status: 400, headers }
      );
    }
    console.error("Maps proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    );
  }
}

// ============================================
// HANDLERS ESPECÍFICOS
// ============================================

async function handleAutocomplete(
  params: z.infer<typeof AutocompleteSchema>,
  headers: any
) {
  const cacheKey = generateCacheKey("ac", params);
  const cached = await getCachedResponse(cacheKey);

  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { headers });
  }

  const components = params.countryCode
    ? `&components=country:${params.countryCode.toLowerCase()}`
    : "";
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    params.query,
  )}&types=(cities)&language=es${components}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetchWithTimeout(url);
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Google Places API error:", {
      status: data.status,
      error_message: data.error_message,
      query: params.query,
    });
    return NextResponse.json(
      {
        error: "Maps API error",
        details: data.status,
        debug: data.error_message || "No additional info",
      },
      { status: 500, headers }
    );
  }

  const result = {
    predictions: (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || "",
      secondaryText: p.structured_formatting?.secondary_text || "",
    })),
  };

  // Cachear por 24 horas (datos de lugares no cambian mucho)
  await setCachedResponse(cacheKey, result, 24 * 60);

  return NextResponse.json(result, { headers });
}

async function handlePlaceDetails(
  params: z.infer<typeof PlaceDetailsSchema>,
  headers: any
) {
  const cacheKey = generateCacheKey("pd", params);
  const cached = await getCachedResponse(cacheKey);

  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { headers });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${params.placeId}&fields=geometry,formatted_address,address_components&language=es&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetchWithTimeout(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.result) {
    return NextResponse.json(
      { error: "Place not found" },
      { status: 404, headers }
    );
  }

  const result = data.result;
  const location = result.geometry?.location;

  // Extraer ciudad y país
  let city = "";
  let country = "";
  let countryCode = "";

  for (const component of result.address_components || []) {
    const types = component.types;
    if (
      types.includes("locality") ||
      types.includes("administrative_area_level_2")
    ) {
      city = component.long_name;
    }
    if (types.includes("country")) {
      country = component.long_name;
      countryCode = component.short_name;
    }
  }

  const output = {
    location: { lat: location.lat, lng: location.lng },
    formattedAddress: result.formatted_address,
    city,
    country,
    countryCode,
  };

  // Cachear por 7 días
  await setCachedResponse(cacheKey, output, 7 * 24 * 60);

  return NextResponse.json(output, { headers });
}

async function handleGeocode(params: z.infer<typeof GeocodeSchema>, headers: any) {
  const cacheKey = generateCacheKey("geo", params);
  const cached = await getCachedResponse(cacheKey);

  if (cached) {
    return NextResponse.json({ ...cached, cached: true }, { headers });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    params.address,
  )}&language=es&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetchWithTimeout(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    return NextResponse.json(
      { error: "Address not found" },
      { status: 404, headers }
    );
  }

  const result = data.results[0];
  const location = result.geometry?.location;

  let city = "";
  let country = "";
  let countryCode = "";

  for (const component of result.address_components) {
    const types = component.types;
    if (
      types.includes("locality") ||
      types.includes("administrative_area_level_2")
    ) {
      city = component.long_name;
    }
    if (types.includes("country")) {
      country = component.long_name;
      countryCode = component.short_name;
    }
  }

  const output = {
    location: { lat: location.lat, lng: location.lng },
    formattedAddress: result.formatted_address,
    city,
    country,
    countryCode,
  };

  // Cachear por 7 días
  await setCachedResponse(cacheKey, output, 7 * 24 * 60);

  return NextResponse.json(output, { headers });
}

async function handleReverseGeocode(
  params: z.infer<typeof ReverseGeocodeSchema>,
  headers: any
) {
  // No cacheamos reverse geocode (coordenadas son únicas)
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${params.lat},${params.lng}&language=es&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetchWithTimeout(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    console.error("Reverse geocode no results:", {
      status: data.status,
      error_message: data.error_message || "No error_message",
      lat: params.lat,
      lng: params.lng,
      hasResults: Array.isArray(data.results) ? data.results.length : 0,
    });
    return NextResponse.json(
      { error: "Location not found" },
      { status: 404, headers }
    );
  }

  const result = data.results[0];

  let city = "";
  let country = "";
  let countryCode = "";

  for (const component of result.address_components) {
    const types = component.types;
    if (
      types.includes("locality") ||
      types.includes("administrative_area_level_2")
    ) {
      city = component.long_name;
    }
    if (types.includes("country")) {
      country = component.long_name;
      countryCode = component.short_name;
    }
  }

  return NextResponse.json(
    {
      location: { lat: params.lat, lng: params.lng },
      formattedAddress: result.formatted_address,
      city,
      country,
      countryCode,
    },
    { headers }
  );
}