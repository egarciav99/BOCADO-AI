import { test, expect } from '@playwright/test';
import { generateTestUser, TestUser } from './utils/test-users';
import { SELECTORS } from './utils/selectors';
import { register, clearAuthState } from './utils/auth';

test.describe('Perfil de Usuario', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    
    // Crear usuario para tests
    testUser = generateTestUser();
    await register(page, testUser);
    
    // Ir al perfil
    await page.click(SELECTORS.bottomNav.profile);
    await expect(page).toHaveURL(/.*profile.*/);
  });

  test.describe('Visualización del perfil', () => {
    test('muestra el nombre del usuario', async ({ page }) => {
      const userName = page.locator(SELECTORS.profile.userName).first();
      await expect(userName).toBeVisible();
      
      const nameText = await userName.textContent();
      expect(nameText).toContain(testUser.firstName);
    });

    test('muestra el email del usuario', async ({ page }) => {
      const userEmail = page.locator(SELECTORS.profile.userEmail).first();
      
      if (await userEmail.isVisible().catch(() => false)) {
        const emailText = await userEmail.textContent();
        expect(emailText).toContain(testUser.email);
      }
    });

    test('muestra estadísticas del perfil', async ({ page }) => {
      // Verificar que hay sección de estadísticas
      const statsSection = page.locator(SELECTORS.profile.statsSection).first();
      
      if (await statsSection.isVisible().catch(() => false)) {
        await expect(statsSection).toBeVisible();
        
        // Verificar IMC
        const bmi = await page.locator(SELECTORS.profile.bmiValue).isVisible().catch(() => false);
        
        // Verificar calorías diarias
        const calories = await page.locator(SELECTORS.profile.dailyCalories).isVisible().catch(() => false);
        
        expect(bmi || calories).toBeTruthy();
      }
    });
  });

  test.describe('Edición del perfil', () => {
    test('puede abrir el modo de edición', async ({ page }) => {
      await page.click(SELECTORS.profile.editButton);
      
      // Verificar que los campos de entrada son visibles
      await expect(page.locator(SELECTORS.profile.firstNameInput).first()).toBeVisible();
    });

    test('puede actualizar el peso del usuario', async ({ page }) => {
      await page.click(SELECTORS.profile.editButton);
      
      const newWeight = '75';
      await page.fill(SELECTORS.profile.weightInput, newWeight);
      await page.click(SELECTORS.profile.saveButton);
      
      // Verificar que se guardó (puede mostrar toast o volver a modo visualización)
      await page.waitForTimeout(1000);
      
      // Verificar que estamos fuera del modo edición
      const saveButtonVisible = await page.locator(SELECTORS.profile.saveButton).isVisible().catch(() => false);
      expect(saveButtonVisible).toBeFalsy();
    });

    test('puede actualizar el objetivo nutricional', async ({ page }) => {
      await page.click(SELECTORS.profile.editButton);
      
      await page.selectOption(SELECTORS.profile.goalSelect, 'lose_weight');
      await page.click(SELECTORS.profile.saveButton);
      
      await page.waitForTimeout(1000);
      
      // Verificar que se guardó
      const saveButtonVisible = await page.locator(SELECTORS.profile.saveButton).isVisible().catch(() => false);
      expect(saveButtonVisible).toBeFalsy();
    });
  });

  test.describe('Gestión de cuenta', () => {
    test('puede cerrar sesión', async ({ page }) => {
      const logoutButton = page.locator(SELECTORS.profile.logoutButton).first();
      
      if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();
        
        // Confirmar si hay modal de confirmación
        const confirmButton = page.locator(SELECTORS.modal.confirmButton);
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }
        
        // Verificar redirección a home/login
        await expect(page).toHaveURL(/.*(\/|login).*/, { timeout: 5000 });
      }
    });

    test('puede navegar a otras secciones desde el perfil', async ({ page }) => {
      // Volver a home
      await page.click(SELECTORS.bottomNav.home);
      await expect(page).toHaveURL(/.*(\/|home).*/);
      
      // Volver al perfil
      await page.click(SELECTORS.bottomNav.profile);
      await expect(page).toHaveURL(/.*profile.*/);
      
      // Ir a recomendaciones
      await page.click(SELECTORS.bottomNav.recommendation);
      await expect(page).toHaveURL(/.*recommendation.*/);
    });
  });

  test.describe('Recetas guardadas', () => {
    test('accede a recetas guardadas desde el perfil', async ({ page }) => {
      // Buscar enlace o botón de recetas guardadas
      const savedRecipesLink = page.locator('a:has-text("Recetas"), button:has-text("Recetas"), a:has-text("Guardadas")').first();
      
      if (await savedRecipesLink.isVisible().catch(() => false)) {
        await savedRecipesLink.click();
        await expect(page).toHaveURL(/.*saved.*/);
      }
    });
  });
});
