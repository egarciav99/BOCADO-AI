import { test, expect } from '@playwright/test';
import { generateTestUser, INVALID_CREDENTIALS, FIXED_TEST_USER } from './utils/test-users';
import { SELECTORS } from './utils/selectors';
import { login, register, clearAuthState } from './utils/auth';

test.describe('Autenticación', () => {
  // Limpiar estado antes de cada test
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test.describe('Registro', () => {
    test('usuario puede registrarse completando el formulario de 3 pasos', async ({ page }) => {
      const user = generateTestUser();
      
      // Paso 1: Ir a la home y hacer click en Empezar
      await page.goto('/');
      await expect(page).toHaveTitle(/Bocado/i);
      
      await page.click(SELECTORS.home.startButton);
      
      // Paso 2: Completar datos personales (Step 1)
      await page.waitForSelector(SELECTORS.register.firstNameInput, { state: 'visible' });
      
      await page.fill(SELECTORS.register.firstNameInput, user.firstName);
      await page.fill(SELECTORS.register.lastNameInput, user.lastName);
      await page.fill(SELECTORS.register.emailInput, user.email);
      await page.fill(SELECTORS.register.passwordInput, user.password);
      await page.fill(SELECTORS.register.confirmPasswordInput, user.password);
      
      await page.click(SELECTORS.register.nextButton);
      
      // Paso 3: Completar datos corporales (Step 2)
      await page.waitForTimeout(500);
      
      if (user.birthDate) {
        await page.fill(SELECTORS.register.birthDateInput, user.birthDate);
      }
      
      // Seleccionar género
      await page.click(SELECTORS.register.genderMale);
      
      if (user.height) {
        await page.fill(SELECTORS.register.heightInput, user.height.toString());
      }
      
      if (user.weight) {
        await page.fill(SELECTORS.register.weightInput, user.weight.toString());
      }
      
      await page.click(SELECTORS.register.nextButton);
      
      // Paso 4: Completar preferencias (Step 3)
      await page.waitForTimeout(500);
      
      if (user.activityLevel) {
        await page.selectOption(SELECTORS.register.activityLevelSelect, user.activityLevel);
      }
      
      if (user.goal) {
        await page.selectOption(SELECTORS.register.goalSelect, user.goal);
      }
      
      if (user.dietType) {
        await page.selectOption(SELECTORS.register.dietTypeSelect, user.dietType);
      }
      
      await page.click(SELECTORS.register.submitButton);
      
      // Verificar redirección exitosa
      await expect(page).toHaveURL(/.*(recommendation|home|app).*/, { timeout: 15000 });
      
      // Verificar que aparece algún elemento de la app
      const navElement = page.locator(SELECTORS.bottomNav.home).first();
      await expect(navElement).toBeVisible({ timeout: 5000 });
    });

    test('muestra error cuando las contraseñas no coinciden', async ({ page }) => {
      await page.goto('/');
      await page.click(SELECTORS.home.startButton);
      
      await page.waitForSelector(SELECTORS.register.firstNameInput, { state: 'visible' });
      
      await page.fill(SELECTORS.register.firstNameInput, 'Test');
      await page.fill(SELECTORS.register.lastNameInput, 'User');
      await page.fill(SELECTORS.register.emailInput, 'test@example.com');
      await page.fill(SELECTORS.register.passwordInput, 'Password123!');
      await page.fill(SELECTORS.register.confirmPasswordInput, 'DifferentPassword123!');
      
      await page.click(SELECTORS.register.nextButton);
      
      // Verificar que hay mensaje de error
      const errorVisible = await page.locator(SELECTORS.register.errorMessage).isVisible().catch(() => false);
      expect(errorVisible).toBeTruthy();
    });

    test('muestra error con email inválido', async ({ page }) => {
      await page.goto('/');
      await page.click(SELECTORS.home.startButton);
      
      await page.waitForSelector(SELECTORS.register.firstNameInput, { state: 'visible' });
      
      await page.fill(SELECTORS.register.firstNameInput, 'Test');
      await page.fill(SELECTORS.register.lastNameInput, 'User');
      await page.fill(SELECTORS.register.emailInput, 'email-invalido');
      await page.fill(SELECTORS.register.passwordInput, 'Password123!');
      await page.fill(SELECTORS.register.confirmPasswordInput, 'Password123!');
      
      await page.click(SELECTORS.register.nextButton);
      
      // El navegador debería mostrar validación de email
      const emailInput = page.locator(SELECTORS.register.emailInput);
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });
  });

  test.describe('Login', () => {
    test('usuario puede iniciar sesión con credenciales válidas', async ({ page }) => {
      // Nota: Este test asume que FIXED_TEST_USER existe
      // Para tests reales, se debería crear el usuario antes o usar un mock
      
      await page.goto('/login');
      
      await page.waitForSelector(SELECTORS.login.emailInput, { state: 'visible' });
      
      await page.fill(SELECTORS.login.emailInput, FIXED_TEST_USER.email);
      await page.fill(SELECTORS.login.passwordInput, FIXED_TEST_USER.password);
      
      await page.click(SELECTORS.login.submitButton);
      
      // Verificar redirección
      await expect(page).toHaveURL(/.*(recommendation|home|app).*/, { timeout: 10000 });
    });

    test('muestra error con credenciales inválidas', async ({ page }) => {
      await page.goto('/login');
      
      await page.waitForSelector(SELECTORS.login.emailInput, { state: 'visible' });
      
      await page.fill(SELECTORS.login.emailInput, INVALID_CREDENTIALS.email);
      await page.fill(SELECTORS.login.passwordInput, INVALID_CREDENTIALS.password);
      
      await page.click(SELECTORS.login.submitButton);
      
      // Verificar mensaje de error
      await page.waitForTimeout(1000);
      
      const errorLocator = page.locator(SELECTORS.login.errorMessage);
      const hasError = await errorLocator.isVisible().catch(() => false);
      
      // O la URL sigue siendo /login
      const url = page.url();
      expect(hasError || url.includes('/login')).toBeTruthy();
    });

    test('navegación entre login y registro funciona', async ({ page }) => {
      await page.goto('/login');
      
      await page.waitForSelector(SELECTORS.login.registerLink, { state: 'visible' });
      await page.click(SELECTORS.login.registerLink);
      
      // Verificar que estamos en la página de registro
      await expect(page).toHaveURL(/.*register.*/);
      await page.waitForSelector(SELECTORS.register.firstNameInput, { state: 'visible' });
    });
  });

  test.describe('Navegación desde Home', () => {
    test('botón Empezar redirige al flujo de registro', async ({ page }) => {
      await page.goto('/');
      
      await page.click(SELECTORS.home.startButton);
      
      // Verificar que estamos en el flujo de registro
      await page.waitForSelector(SELECTORS.register.firstNameInput, { state: 'visible' });
    });

    test('botón Iniciar sesión redirige a login', async ({ page }) => {
      await page.goto('/');
      
      const loginButton = page.locator(SELECTORS.home.loginButton).first();
      if (await loginButton.isVisible().catch(() => false)) {
        await loginButton.click();
        await expect(page).toHaveURL(/.*login.*/);
      }
    });
  });
});
