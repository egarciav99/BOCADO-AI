/**
 * CORS origin validation utility.
 * Shared across API routes to ensure consistent origin policies.
 * 
 * Supports:
 * - Exact origin matches
 * - Wildcard patterns (e.g., *.vercel.app)
 * - Localhost auto-allow in dev
 * - Same-origin requests (no origin header)
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

export const ALLOWED_ORIGINS_LIST = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...envAllowed]),
);

const wildcardPatterns = ALLOWED_ORIGINS_LIST.filter((o) => o.includes("*")).map(
  (p) =>
    new RegExp("^" + p.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$", "i"),
);

/**
 * Check if origin is allowed.
 * 
 * @param origin - The origin header from the request
 * @returns true if origin is allowed, false otherwise
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // Permitir peticiones sin origin (same-origin requests, mobile apps, etc.)
  if (!origin) return true;

  // Quick allow for local dev hosts
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return true;
  }

  // Normalize and exact-match against configured origins
  const originLower = origin.toLowerCase();
  if (ALLOWED_ORIGINS_LIST.map((o) => o.toLowerCase()).includes(originLower))
    return true;

  // Match wildcard patterns (e.g. https://*.vercel.app)
  for (const re of wildcardPatterns) {
    try {
      if (re.test(origin)) return true;
    } catch (e) {
      // ignore bad regex
    }
  }

  // Allow common preview host patterns (vercel / previews)
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
    // If origin is not a valid URL, deny below
  }

  return false;
}
