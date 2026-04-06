# 🛠️ IMPLEMENTACIÓN: Fixes Críticos Paso a Paso

Este documento contiene código listo para refactorizar. Cada sección incluye:
- El problema exacto
- Código de reemplazo
- Archivos afectados
- Testing requerido

---

## FIX #1: Unified Firebase Admin Initialization (5 MIN)

**Files affected**: 4  
**Effort**: Extract to shared utility, update 4 imports.

### Create: `src/lib/api/firebase-admin.ts`

```typescript
import { initializeApp, getApps } from "firebase-admin/app";
import { cert } from "firebase-admin/app";

/**
 * Shared Firebase Admin initialization.
 * Prevents duplicating initialization logic across 4 API routes.
 * 
 * Usage:
 * ```
 * const adminApp = initFirebaseAdmin();
 * const db = adminApp ? getFirestore() : null;
 * ```
 */
export function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY not configured");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey.trim());
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    return null;
  }
}
```

### Replace in: `src/pages/api/maps-proxy.ts`

**Remove lines 14-24:**
```typescript
// DELETE THIS
const getAdminApp = () => {
  if (getApps().length > 0) return getApps()[0];
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no definida");
    }
    const serviceAccount = JSON.parse(serviceAccountKey.trim());
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("❌ Error Firebase Admin Init (Maps Proxy):", error);
    return null;
  }
};

const adminApp = getAdminApp();
```

**Add at top (after imports):**
```typescript
import { initFirebaseAdmin } from "../../lib/api/firebase-admin";

const adminApp = initFirebaseAdmin();
```

### Replace in: `src/pages/api/invalidate-cache.ts`

Same pattern - delete lines 26-43, add import.

### Replace in: `src/pages/api/recommend.ts`

Same pattern - delete lines 24-42, add import.

### Replace in: `src/pages/api/ingredients.ts`

Same pattern - delete lines 11-24, add import.

---

## FIX #2: Unified CORS Origin Checking (5 MIN)

**Files affected**: 2  
**Effort**: Extract to shared utility, update 2 imports.

### Create: `src/lib/api/cors-utils.ts`

```typescript
/**
 * CORS origin validation utility.
 * Shared across API routes to ensure consistent origin policies.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  // Production
  "https://bocado-ai.vercel.app",
  "https://bocado.app",
  "https://www.bocado.app",
  "https://app.bocado.app",
  // Development
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const envAllowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...envAllowed]),
);

/**
 * Check if origin is allowed.
 * Supports:
 * - Exact origin matches
 * - Wildcard patterns (*.vercel.app)
 * - Localhost auto-allow in dev
 * - Same-origin requests (no origin header)
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // Permitir peticiones sin origin (same-origin, mobile apps)
  if (!origin) return true;

  // Quick allow for local dev hosts
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return true;
  }

  // Lowercase comparison
  const originLower = origin.toLowerCase();
  if (ALLOWED_ORIGINS.map((o) => o.toLowerCase()).includes(originLower)) {
    return true;
  }

  // Wildcard patterns
  const wildcardPatterns = ALLOWED_ORIGINS.filter((o) => o.includes("*")).map(
    (p) =>
      new RegExp("^" + p.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$", "i"),
  );

  for (const re of wildcardPatterns) {
    try {
      if (re.test(origin)) return true;
    } catch (e) {
      // Ignore bad regex
    }
  }

  // Allow common preview patterns
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith(".vercel-preview.app") ||
      hostname.endsWith(".githubpreview.dev")
    ) {
      return true;
    }
  } catch (e) {
    // Not a valid URL
  }

  return false;
}

export const ALLOWED_ORIGINS_LIST = ALLOWED_ORIGINS;
```

### Replace in: `src/pages/api/maps-proxy.ts`

**Remove lines 283-331** (entire isOriginAllowed function and ALLOWED_ORIGINS array)

**Add at top:**
```typescript
import { isOriginAllowed, ALLOWED_ORIGINS_LIST } from "../../lib/api/cors-utils";
```

### Replace in: `src/pages/api/invalidate-cache.ts`

**Remove lines 52-73** (isOriginAllowed function and ALLOWED_ORIGINS array)

**Add at top:**
```typescript
import { isOriginAllowed } from "../../lib/api/cors-utils";
```

---

## FIX #3: Universal Fetch Timeout Wrapper (10 MIN)

**Files affected**: 5 (everywhere that calls fetch)  
**Effort**: Create utility, wrap 8+ fetch calls.

### Create: `src/lib/api/utils/fetch-with-timeout.ts`

```typescript
/**
 * Fetch wrapper that enforces timeouts on ALL requests.
 * Prevents hanging requests from blocking your API.
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper for JSON responses with timeout
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    timeoutMs: options.timeoutMs ?? 8000,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

### Replace in: `src/lib/api/utils/fatsecret.ts`

**Before (line 60):**
```typescript
const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${stringifyParams(params)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**After:**
```typescript
import { fetchWithTimeout } from "./fetch-with-timeout";

const res = await fetchWithTimeout(
  `https://platform.fatsecret.com/rest/server.api?${stringifyParams(params)}`,
  {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 6000, // FatSecret can be slow
  }
);
```

Do the same for `getFatSecretFood` and `analyzeNaturalLanguage`.

---

## FIX #4: Merge Rate Limiters (15 MIN)

**Files affected**: 2  
**Effort**: Create abstract base class, update 2 implementations.

### Create: `src/lib/api/utils/rate-limiter-base.ts`

```typescript
import { FieldValue } from "firebase-admin/firestore";

export interface RateLimitConfig {
  windowMs: number; // Time window (ms)
  maxRequests: number; // Max requests in window
  cooldownMs?: number; // Min time between requests
}

export interface RateLimitResult {
  allowed: boolean;
  secondsLeft?: number;
  error?: string;
  remainingRequests?: number;
}

/**
 * Abstract rate limiter for different identifier types (IP, userID, etc).
 * Implements common logic to prevent duplication.
 */
export abstract class RateLimiter {
  protected config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      cooldownMs: config.cooldownMs || 0,
    };
  }

  /**
   * Get Firestore document reference for this identifier.
   * Subclasses implement where to store (rate_limit_v2, maps_proxy_rate_limits, etc)
   */
  protected abstract getDocRef(identifier: string): any;

  /**
   * Check if allowed and record request.
   */
  async checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const docRef = this.getDocRef(identifier);
    const now = Date.now();

    try {
      return await (docRef.firestore || docRef.parent.parent).runTransaction(
        async (t: any) => {
          const doc = await t.get(docRef);
          const data = doc.exists ? doc.data() : null;

          // Filter valid requests in current window
          const validRequests = (data?.requests || []).filter(
            (ts: number) => now - ts < this.config.windowMs,
          );

          // Check if exceeded max requests
          if (validRequests.length >= this.config.maxRequests) {
            const oldestRequest = Math.min(...validRequests);
            const retryAfter = Math.ceil(
              (oldestRequest + this.config.windowMs - now) / 1000,
            );
            return {
              allowed: false,
              secondsLeft: Math.max(1, retryAfter),
              error: this.formatError("window_exceeded", retryAfter),
              remainingRequests: 0,
            };
          }

          // Check cooldown if enabled
          if (this.config.cooldownMs > 0 && validRequests.length > 0) {
            const lastRequest = Math.max(...validRequests);
            const timeSinceLastRequest = now - lastRequest;

            if (timeSinceLastRequest < this.config.cooldownMs) {
              const secondsLeft = Math.ceil(
                (this.config.cooldownMs - timeSinceLastRequest) / 1000,
              );
              return {
                allowed: false,
                secondsLeft,
                error: this.formatError("cooldown", secondsLeft),
                remainingRequests: this.config.maxRequests - validRequests.length,
              };
            }
          }

          // Allowed - record request
          t.set(docRef, {
            requests: [...validRequests, now],
            updatedAt: FieldValue.serverTimestamp(),
            metadata: {
              lastCheck: now,
              windowSize: this.config.windowMs,
            },
          });

          return {
            allowed: true,
            remainingRequests: this.config.maxRequests - validRequests.length - 1,
          };
        },
      );
    } catch (error) {
      console.error("Rate limit check error:", error);
      // FAIL-CLOSED: Deny on error
      return {
        allowed: false,
        error: "Rate limit service unavailable",
      };
    }
  }

  /**
   * Format error message (override in subclass for custom messages).
   */
  protected formatError(type: string, secondsLeft: number): string {
    if (type === "window_exceeded") {
      return `Too many requests. Retry in ${secondsLeft}s.`;
    }
    return `Please wait ${secondsLeft}s before trying again.`;
  }
}
```

### Create: `src/lib/api/utils/ip-rate-limiter.ts`

```typescript
import { RateLimiter, RateLimitConfig } from "./rate-limiter-base";

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute for unauthenticated
};

/**
 * IP-based rate limiter (for unauthenticated endpoints).
 */
export class IPRateLimiter extends RateLimiter {
  private db: any;

  constructor(db: any, config: RateLimitConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.db = db;
  }

  protected getDocRef(ip: string) {
    return this.db.collection("rate_limits_ip").doc(ip);
  }

  protected formatError(type: string, secondsLeft: number): string {
    if (type === "window_exceeded") {
      return `Too many requests from this IP. Retry in ${secondsLeft}s.`;
    }
    return `Please wait ${secondsLeft}s before trying again.`;
  }
}
```

### Create: `src/lib/api/utils/user-rate-limiter.ts`

```typescript
import { RateLimiter, RateLimitConfig } from "./rate-limiter-base";
import { FieldValue } from "firebase-admin/firestore";

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5, // 5 requests per 10 minutes
  cooldownMs: 30 * 1000, // 30s between requests
};

/**
 * User-based rate limiter (for authenticated endpoints).
 * Also tracks "stuck" processes (incomplete requests).
 */
export class UserRateLimiter extends RateLimiter {
  private db: any;
  private stuckThresholdMs = 2 * 60 * 1000; // 2 minutes

  constructor(db: any, config: RateLimitConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.db = db;
  }

  protected getDocRef(userId: string) {
    return this.db.collection("rate_limit_v2").doc(userId);
  }

  /**
   * Check if user has a stuck process and clean it up.
   */
  async checkAndCleanupStuckProcess(userId: string): Promise<boolean> {
    const docRef = this.getDocRef(userId);
    const now = Date.now();

    try {
      const doc = await docRef.get();
      if (!doc.exists) return false;

      const { currentProcess } = doc.data();
      if (!currentProcess) return false;

      const processAge = now - currentProcess.startedAt;
      if (processAge > this.stuckThresholdMs) {
        await docRef.update({
          currentProcess: null,
          metadata: {
            cleanedUp: true,
            cleanupReason: "stuck_process",
            cleanupTime: new Date(),
          },
        });
        return true;
      }
    } catch (error) {
      console.error("Error checking stuck process:", error);
    }

    return false;
  }

  protected formatError(type: string, secondsLeft: number): string {
    if (type === "window_exceeded") {
      return `Limit of ${this.config.maxRequests} requests per ${this.config.windowMs / 60000} minutes. Retry in ${secondsLeft}s.`;
    }
    return `Please wait ${secondsLeft}s before trying again.`;
  }
}
```

### Replace in: `src/pages/api/recommend.ts`

**Remove the entire `DistributedRateLimiter` class (lines 57-240)**

**Add at top:**
```typescript
import { UserRateLimiter } from "../../lib/api/utils/user-rate-limiter";
import { IPRateLimiter } from "../../lib/api/utils/ip-rate-limiter";

const rateLimiter = new UserRateLimiter(db);
const ipRateLimiter = new IPRateLimiter(db);
```

### Replace in: `src/pages/api/maps-proxy.ts`

**Remove the `checkRateLimit` function (lines 163-210)**

**Add at top:**
```typescript
import { IPRateLimiter } from "../../lib/api/utils/ip-rate-limiter";

const ipRateLimiter = new IPRateLimiter(db, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute for maps
});
```

**Replace the actual rate limit check:**
```typescript
// OLD (remove):
const rateCheck = await checkRateLimit(clientIP, isAuthenticated);

// NEW:
const rateCheck = await ipRateLimiter.checkRateLimit(clientIP);
```

---

## FIX #5: Extract & Share filterIngredientes (10 MIN)

**Files affected**: 2  
**Effort**: Move to service, import in 2 places.

### Create: `src/lib/api/services/ingredient-filter.ts`

```typescript
import { FirestoreIngredient, UserProfile } from "./data-service";
import { createRegexPattern, normalizeText } from "../utils/shared-logic";

/**
 * Filter ingredients based on user preferences:
 * - Allergies (critical)
 * - Dislikes
 * - Eating habits (vegan/vegetarian)
 * - Diseases (diabetes, hypertension, etc)
 */
export function filterIngredientes(
  allIngredients: FirestoreIngredient[],
  user: UserProfile,
): FirestoreIngredient[] {
  const allergies = (user.allergies || []).map((a) => a.toLowerCase());
  const dislikedFoods = (user.dislikedFoods || []).map((d) => d.toLowerCase());
  const eatingHabit = (user.eatingHabit || "").toLowerCase();
  const diseases = (user.diseases || []).map((d) => d.toLowerCase());
  const otherAllergies = (user.otherAllergies || "")
    .toLowerCase()
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  // Allergen mapping (comprehensive)
  const allergenMap: Record<string, string[]> = {
    "alergia a frutos secos": [
      "nuez",
      "almendra",
      "cacahuate",
      "pistacho",
      "avellana",
      "semilla",
      "pecan",
    ],
    celíaco: ["trigo", "cebada", "centeno", "gluten", "pan", "pasta", "galleta"],
    "alergia a mariscos": [
      "camarón",
      "langosta",
      "cangrejo",
      "mejillón",
      "ostra",
      "camarones",
      "pulpo",
    ],
    "alergia a cacahuates": ["cacahuate", "maní", "mantequilla de maní"],
    "intolerancia a la lactosa": [
      "leche",
      "queso",
      "yogur",
      "mantequilla",
      "crema",
      "nata",
      "helado",
    ],
    "alergia al huevo": ["huevo", "clara", "yema"],
  };

  return allIngredients.filter((ingredient) => {
    const name = ingredient.name.toLowerCase();
    const regional = ingredient.regional.es?.toLowerCase() || "";
    const mx = ingredient.regional.mx?.toLowerCase() || "";
    const combinedText = `${name} ${regional} ${mx}`;

    // 1️⃣ CRITICAL: Exclude disliked foods
    if (dislikedFoods.some((d) => {
      const pattern = createRegexPattern(d);
      return new RegExp(pattern, "i").test(combinedText);
    })) {
      return false;
    }

    // 2️⃣ Exclude allergens
    for (const allergyKey of allergies) {
      const allergens = allergenMap[allergyKey] || [allergyKey];
      if (allergens.some((a) => new RegExp(`\\b${a}\\b`, "i").test(combinedText))) {
        return false;
      }
    }

    // 2.1️⃣ Exclude manual allergies
    if (otherAllergies.some((oa) => {
      const pattern = createRegexPattern(oa);
      return new RegExp(pattern, "i").test(combinedText);
    })) {
      return false;
    }

    // 3️⃣ Filter by diet
    if (eatingHabit.includes("vegano")) {
      const animalProducts = [
        "carne",
        "pollo",
        "pavo",
        "res",
        "cerdo",
        "cordero",
        "pescado",
        "camarón",
        "huevo",
        "leche",
        "queso",
        "miel",
      ];
      if (animalProducts.some((m) => new RegExp(`\\b${m}\\b`, "i").test(combinedText))) {
        return false;
      }
    } else if (eatingHabit.includes("vegetariano")) {
      const meats = [
        "carne",
        "pollo",
        "pavo",
        "res",
        "cerdo",
        "cordero",
        "pescado",
        "camarón",
      ];
      if (meats.some((m) => new RegExp(`\\b${m}\\b`, "i").test(combinedText))) {
        return false;
      }
    }

    // 4️⃣ Filter by disease
    for (const disease of diseases) {
      if (disease.includes("diabetes")) {
        const highSugar = [
          "azúcar",
          "dulce",
          "postre",
          "chocolate",
          "refresco",
          "jugo de",
          "miel",
          "caramelo",
        ];
        if (highSugar.some((s) => combinedText.includes(s))) {
          return false;
        }
      }

      if (disease.includes("hipertensión")) {
        const saltyFoods = [
          "sal",
          "embutido",
          "jamón",
          "tocino",
          "salchicha",
          "conserva",
          "enlatado",
        ];
        if (saltyFoods.some((s) => combinedText.includes(s))) {
          return false;
        }
      }

      if (disease.includes("colesterol")) {
        const fattyFoods = ["manteca", "mantequilla", "chicharrón", "grasa animal", "crema"];
        if (fattyFoods.some((f) => combinedText.includes(f))) {
          return false;
        }
      }

      if (disease.includes("intestino irritable") || disease.includes("ibs")) {
        const irritants = ["picante", "chile", "ají", "curry", "café"];
        if (irritants.some((i) => combinedText.includes(i))) {
          return false;
        }
      }
    }

    return true;
  });
}
```

### Replace in: `src/pages/api/recommend.ts`

**Remove the entire `filterIngredientes` function (lines 440-560)**

**Add at top:**
```typescript
import { filterIngredientes } from "../../lib/api/services/ingredient-filter";
```

### Replace in: `src/test/api/ingredient-filtering.test.ts`

**Remove the duplicate `filterIngredientes` function**

**Add at top:**
```typescript
import { filterIngredientes } from "../../../src/lib/api/services/ingredient-filter";
```

---

## FIX #6: Enable ESLint (5 MIN)

### In: `eslint.config.js`

**Find line 113:**
```typescript
"@typescript-eslint/no-unused-vars": "off"  // ❌ REMOVE THIS
```

**Replace with:**
```typescript
"@typescript-eslint/no-unused-vars": [
  "warn",
  {
    argsIgnorePattern: "^_",
    varsIgnorePattern: "^_",
  },
],
```

Then run:
```bash
npm run lint -- --fix
```

This will auto-fix many issues and show you the rest.

---

## Summary: Files To Create or Modify

| File | Action | Time |
|------|--------|------|
| src/lib/api/firebase-admin.ts | CREATE | 5 min |
| src/lib/api/cors-utils.ts | CREATE | 5 min |
| src/lib/api/utils/fetch-with-timeout.ts | CREATE | 5 min |
| src/lib/api/utils/rate-limiter-base.ts | CREATE | 10 min |
| src/lib/api/utils/ip-rate-limiter.ts | CREATE | 5 min |
| src/lib/api/utils/user-rate-limiter.ts | CREATE | 5 min |
| src/lib/api/services/ingredient-filter.ts | CREATE | 5 min |
| src/pages/api/maps-proxy.ts | MODIFY (remove duplicates) | 5 min |
| src/pages/api/invalidate-cache.ts | MODIFY (remove duplicates) | 5 min |
| src/pages/api/recommend.ts | MODIFY (replace 200+ lines) | 10 min |
| src/pages/api/ingredients.ts | MODIFY (remove duplicates) | 3 min |
| src/lib/api/utils/fatsecret.ts | MODIFY (add timeout wrapper) | 5 min |
| eslint.config.js | MODIFY (re-enable rule) | 2 min |
| src/test/api/ingredient-filtering.test.ts | MODIFY (import shared service) | 2 min |

**Total estimated time: ~75 minutes (1.5 hours)**

---

## Testing Checklist

After applying these fixes:

- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm run build` succeeds
- [ ] All API endpoints respond (GET /api/recommend?userId=test)
- [ ] Rate limiting works (send 6 requests to /api/recommend in 1 second → 6th returns 429)
- [ ] Timeouts work (mock FatSecret to hang 10s → request returns error after 6s)
- [ ] Ingredient filtering filters correctly (create test user with allergie "Celíaco" → recipes with "pan" are excluded)

---

## Deployment Checklist

Before merging to main:

- [ ] All tests pass (`npm test`)
- [ ] No build warnings
- [ ] ESLint passes (`npm run lint`)
- [ ] No console.error in happy path
- [ ] Firebase rules updated (if needed)
- [ ] Environment variables documented
