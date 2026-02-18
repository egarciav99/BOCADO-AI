import { FullConfig } from "@playwright/test";

/**
 * Global Setup para Playwright
 * Se ejecuta una vez antes de todos los tests
 */
async function globalSetup(config: FullConfig) {
  console.log("🚀 Iniciando setup global de tests E2E...");

  // Aquí se puede:
  // 1. Iniciar el emulador de Firebase
  // 2. Crear usuarios de prueba iniciales
  // 3. Limpiar datos de tests anteriores
  // 4. Iniciar servicios mock

  // Ejemplo: Verificar que el servidor está disponible
  const { baseURL } = config.projects[0].use;
  console.log(`📍 Base URL: ${baseURL}`);

  console.log("✅ Setup global completado");
}

export default globalSetup;
