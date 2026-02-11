/**
 * Ejemplo de tests usando fixtures personalizados
 * 
 * Los fixtures simplifican la configuración común de tests
 * y hacen que el código sea más limpio y reutilizable.
 */

import { test, expect } from './fixtures';
import { SELECTORS } from './utils/selectors';

test.describe('Ejemplo usando Fixtures', () => {
  
  /**
   * Ejemplo 1: Usando authenticatedUser fixture
   * El usuario ya está registrado y logueado automáticamente
   */
  test('usuario autenticado puede generar recomendación', async ({ page, authenticatedUser }) => {
    // El usuario ya está logueado, podemos ir directo a la acción
    console.log(`Usuario creado: ${authenticatedUser.email}`);
    
    // Generar recomendación
    await page.click(SELECTORS.recommendation.homeOption);
    await page.click(SELECTORS.recommendation.mealTypeLunch);
    await page.click(SELECTORS.recommendation.generateButton);
    
    // Verificar resultado
    await page.waitForSelector(SELECTORS.recommendation.recommendationResult, { 
      state: 'visible', 
      timeout: 30000 
    });
    
    await expect(page.locator(SELECTORS.recommendation.mealCard).first()).toBeVisible();
  });
  
  /**
   * Ejemplo 2: Usando authenticatedPage fixture
   * Incluye cleanup automático después del test
   */
  test('puede actualizar perfil y limpiar automáticamente', async ({ page, authenticatedPage }) => {
    const { user } = authenticatedPage;
    
    console.log(`Trabajando con usuario: ${user.email}`);
    
    // Ir al perfil
    await page.click(SELECTORS.bottomNav.profile);
    await expect(page).toHaveURL(/.*profile.*/);
    
    // Editar perfil
    await page.click(SELECTORS.profile.editButton);
    await page.fill(SELECTORS.profile.firstNameInput, 'NombreActualizado');
    await page.click(SELECTORS.profile.saveButton);
    
    // Verificar cambio
    await page.waitForTimeout(1000);
    
    // El cleanup se ejecuta automáticamente después del test
  });
  
  /**
   * Ejemplo 3: Test sin fixture de autenticación
   * Usar cuando se quiere probar el flujo completo
   */
  test('flujo completo de registro a primera recomendación', async ({ page }) => {
    // Este test usa el fixture page que ya limpia el estado
    // Pero no crea usuario automáticamente
    
    // Aquí harías todo el flujo manualmente...
    await page.goto('/');
    await expect(page).toHaveTitle(/Bocado/i);
    
    // Continuar con el flujo...
  });
});

/**
 * Comparación: Sin fixtures vs Con fixtures
 * 
 * SIN FIXTURES (más código repetitivo):
 * ```typescript
 * test('test 1', async ({ page }) => {
 *   await clearAuthState(page);
 *   const user = generateTestUser();
 *   await register(page, user);
 *   // ... test
 * });
 * 
 * test('test 2', async ({ page }) => {
 *   await clearAuthState(page);
 *   const user = generateTestUser();
 *   await register(page, user);
 *   // ... test
 * });
 * ```
 * 
 * CON FIXTURES (más limpio):
 * ```typescript
 * test('test 1', async ({ page, authenticatedUser }) => {
 *   // authenticatedUser ya está listo
 *   // ... test
 * });
 * 
 * test('test 2', async ({ page, authenticatedUser }) => {
 *   // authenticatedUser ya está listo
 *   // ... test
 * });
 * ```
 */
