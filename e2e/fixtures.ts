import { test as base, expect } from "@playwright/test";
import { TestUser, generateTestUser } from "./utils/test-users";
import { register, clearAuthState } from "./utils/auth";

/**
 * Fixtures personalizados para tests de Bocado AI
 *
 * Estos fixtures extienden los tests base de Playwright
 * con utilidades específicas de nuestra aplicación.
 */

type BocadoFixtures = {
  /**
   * Usuario de test autenticado
   * Se crea automáticamente antes del test
   */
  authenticatedUser: TestUser;

  /**
   * Página con un usuario ya logueado
   */
  authenticatedPage: {
    user: TestUser;
    cleanup: () => Promise<void>;
  };
};

/**
 * Test extendido con fixtures de Bocado AI
 *
 * Ejemplo de uso:
 * ```typescript
 * import { test, expect } from '../fixtures';
 *
 * test('mi test', async ({ page, authenticatedUser }) => {
 *   // authenticatedUser ya está creado y logueado
 * });
 * ```
 */
export const test = base.extend<BocadoFixtures>({
  /**
   * Fixture: Usuario autenticado
   * Crea un nuevo usuario y lo registra antes de cada test
   */
  authenticatedUser: async ({ page }, use) => {
    const user = generateTestUser();
    await register(page, user);
    await use(user);
  },

  /**
   * Fixture: Página autenticada con cleanup
   * Similar a authenticatedUser pero con función de limpieza
   */
  authenticatedPage: async ({ page }, use) => {
    const user = generateTestUser();
    await register(page, user);

    await use({
      user,
      cleanup: async () => {
        await clearAuthState(page);
      },
    });

    // Cleanup automático después del test
    await clearAuthState(page);
  },

  /**
   * Override del page para siempre limpiar estado
   */
  page: async ({ page }, use) => {
    await clearAuthState(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
