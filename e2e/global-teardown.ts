import { FullConfig } from '@playwright/test';

/**
 * Global Teardown para Playwright
 * Se ejecuta una vez después de todos los tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Iniciando teardown global de tests E2E...');
  
  // Aquí se puede:
  // 1. Detener el emulador de Firebase
  // 2. Limpiar usuarios de prueba creados
  // 3. Borrar datos de tests
  // 4. Detener servicios mock
  
  console.log('✅ Teardown global completado');
}

export default globalTeardown;
