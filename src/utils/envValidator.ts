/**
 * Environment Variables Validator
 * Valida que todas las variables requeridas están configuradas en NEXT_PUBLIC_*
 */

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
];

const OPTIONAL_ENV_VARS = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_APP_VERSION",
  "NEXT_PUBLIC_REGISTER_USER_URL",
];

/**
 * Valida variables de entorno requeridas
 * Retorna lista de variables faltantes
 */
export function validateEnvironment(): { missing: string[]; optional: string[] } {
  const missing: string[] = [];
  const missingOptional: string[] = [];

  // Validar variables requeridas
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === "") {
      missing.push(varName);
    }
  }

  // Validar variables opcionales (solo loguear si están faltando)
  for (const varName of OPTIONAL_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === "") {
      missingOptional.push(varName);
    }
  }

  return { missing, optional: missingOptional };
}

/**
 * Log de variables de entorno en desarrollo
 */
export function logEnvironmentStatus(): void {
  if (typeof window === "undefined") return; // Solo en cliente

  const isDev = process.env.NODE_ENV === "development";
  const { missing, optional } = validateEnvironment();

  if (missing.length > 0) {
    console.error(
      "❌ [ENV] Missing required variables:",
      missing.join(", ")
    );
  } else if (!isDev) {
    console.log("✅ [ENV] All required variables configured");
  }

  if (optional.length > 0 && isDev) {
    console.warn("⚠️ [ENV] Optional variables not configured:", optional.join(", "));
  }
}
