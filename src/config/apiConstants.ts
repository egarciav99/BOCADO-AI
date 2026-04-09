/**
 * API Configuration Constants
 * Centralized configuration to avoid magic numbers scattered throughout the codebase
 */

// ============================================
// TIMEOUTS (milliseconds)
// ============================================
export const TIMEOUTS = {
  /** Timeout for Google Maps reverse geocoding */
  GOOGLE_MAPS_REVERSE_GEOCODE: 5000, // 5s
  
  /** Timeout for Gemini AI generation */
  GEMINI_GENERATION: 60000, // 60s - needed for gemini-2.5-flash
  
  /** Timeout for Firestore history queries */
  FIRESTORE_HISTORY_QUERY: 8000, // 8s
  
  /** Timeout for FatSecret API calls (defined in fatsecret.ts) */
  FATSECRET_API: 5000, // 5s
  
  /** Timeout for Airtable pantry enrichment (pre-Gemini) */
  AIRTABLE_ENRICHMENT: 8000, // 8s - fail fast, use fallback
  
  /** Timeout for post-Gemini nutrition enrichment */
  NUTRITION_ENRICHMENT: 10000, // 10s - non-blocking, use Gemini macros on timeout
} as const;

// ============================================
// RATE LIMITING
// ============================================
export const RATE_LIMITS = {
  /** IP rate limit window (milliseconds) */
  IP_WINDOW_MS: 60 * 1000, // 1 minute
  
  /** Max requests per IP per window */
  IP_MAX_REQUESTS: 30,
  
  /** Block duration if IP limit exceeded */
  IP_BLOCK_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  
  /** User rate limit (defined in user-rate-limiter.ts) */
  USER_WINDOW_MS: 10 * 60 * 1000, // 10 minutes
  USER_MAX_REQUESTS: 2,
  USER_COOLDOWN_MS: 60 * 1000, // 1 minute
} as const;

// ============================================
// CACHE CONFIGURATION
// ============================================
export const CACHE = {
  /** Google Places cache TTL */
  PLACES_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours
  
  /** Places cache buffer (extra time before expiry) */
  PLACES_BUFFER_MS: 60 * 60 * 1000, // 1 hour
} as const;

// ============================================
// SEARCH & LOCATION
// ============================================
export const SEARCH = {
  /** Search radius for nearby restaurants (meters) */
  RADIUS_METERS: 8000, // 8km
  
  /** Coordinate decimal precision for display */
  COORDINATE_PRECISION: 4,
} as const;

// ============================================
// AI MODEL LIMITS
// ============================================
export const AI_LIMITS = {
  /** Gemini max output tokens for "En casa" (recipes) */
  TOKENS_RECIPES: 8192,

  /** Gemini max output tokens for "Fuera" (restaurants) */
  TOKENS_RESTAURANTS: 8192,
} as const;

// ============================================
// DATA VALIDATION LIMITS
// ============================================
export const VALIDATION_LIMITS = {
  /** Max calories per recipe/meal */
  MAX_KCAL: 50000,
  
  /** Max macros per nutrient (grams) */
  MAX_MACROS_G: 5000,
  
  /** Max characters per preparation step */
  MAX_STEP_LENGTH: 1000,
  
  /** Max preparation steps per recipe */
  MAX_STEPS: 50,
  
  /** Max greeting message length */
  MAX_GREETING_LENGTH: 1000,
  
  /** Max error stack trace length in logs */
  MAX_ERROR_STACK_LENGTH: 1000,
} as const;

// ============================================
// ALLOWED ORIGINS (CORS)
// ============================================
export const ALLOWED_ORIGINS = [
  "https://bocado-ai.vercel.app",
  "https://www.bocado-ai.vercel.app",
  // Development environments
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
] as const;
