import { test, expect } from "@playwright/test";
import { generateTestUser, TestUser } from "./utils/test-users";
import { SELECTORS } from "./utils/selectors";
import { register, clearAuthState } from "./utils/auth";

test.describe("Recomendaciones", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);

    // Crear usuario para tests
    testUser = generateTestUser();
    await register(page, testUser);
  });

  test.describe("Generación de recomendaciones", () => {
    test('puede generar recomendación "En casa" para desayuno', async ({
      page,
    }) => {
      // Seleccionar ubicación "En casa"
      await page.click(SELECTORS.recommendation.homeOption);

      // Seleccionar tipo de comida
      await page.click(SELECTORS.recommendation.mealTypeBreakfast);

      // Click en generar
      await page.click(SELECTORS.recommendation.generateButton);

      // Verificar que aparece el resultado
      await page.waitForSelector(
        SELECTORS.recommendation.recommendationResult,
        {
          state: "visible",
          timeout: 30000,
        },
      );

      // Verificar elementos del resultado
      await expect(
        page.locator(SELECTORS.recommendation.recipeTitle).first(),
      ).toBeVisible();
    });

    test('puede generar recomendación "En casa" para almuerzo', async ({
      page,
    }) => {
      await page.click(SELECTORS.recommendation.homeOption);
      await page.click(SELECTORS.recommendation.mealTypeLunch);
      await page.click(SELECTORS.recommendation.generateButton);

      await page.waitForSelector(
        SELECTORS.recommendation.recommendationResult,
        {
          state: "visible",
          timeout: 30000,
        },
      );

      await expect(
        page.locator(SELECTORS.recommendation.mealCard).first(),
      ).toBeVisible();
    });

    test('puede generar recomendación "En casa" para cena', async ({
      page,
    }) => {
      await page.click(SELECTORS.recommendation.homeOption);
      await page.click(SELECTORS.recommendation.mealTypeDinner);
      await page.click(SELECTORS.recommendation.generateButton);

      await page.waitForSelector(
        SELECTORS.recommendation.recommendationResult,
        {
          state: "visible",
          timeout: 30000,
        },
      );

      await expect(
        page.locator(SELECTORS.recommendation.mealCard).first(),
      ).toBeVisible();
    });

    test('puede generar recomendación "Fuera" para comida', async ({
      page,
    }) => {
      await page.click(SELECTORS.recommendation.outsideOption);
      await page.click(SELECTORS.recommendation.mealTypeLunch);
      await page.click(SELECTORS.recommendation.generateButton);

      await page.waitForSelector(
        SELECTORS.recommendation.recommendationResult,
        {
          state: "visible",
          timeout: 30000,
        },
      );

      await expect(
        page.locator(SELECTORS.recommendation.mealCard).first(),
      ).toBeVisible();
    });

    test("muestra información nutricional en la recomendación", async ({
      page,
    }) => {
      await page.click(SELECTORS.recommendation.homeOption);
      await page.click(SELECTORS.recommendation.mealTypeLunch);
      await page.click(SELECTORS.recommendation.generateButton);

      await page.waitForSelector(
        SELECTORS.recommendation.recommendationResult,
        {
          state: "visible",
          timeout: 30000,
        },
      );

      // Verificar que aparecen calorías
      const hasCalories = await page
        .locator(SELECTORS.recommendation.calories)
        .isVisible()
        .catch(() => false);

      // O verificar que hay contenido de macros
      const hasMacros = await page
        .locator(SELECTORS.recommendation.macros)
        .isVisible()
        .catch(() => false);

      expect(hasCalories || hasMacros).toBeTruthy();
    });
  });

  test.describe("Interacción con recetas", () => {
    test.beforeEach(async ({ page }) => {
      // Generar una recomendación primero
      await page.click(SELECTORS.recommendation.homeOption);
      await page.click(SELECTORS.recommendation.mealTypeLunch);
      await page.click(SELECTORS.recommendation.generateButton);

      await page.waitForSelector(
        SELECTORS.recommendation.recommendationResult,
        {
          state: "visible",
          timeout: 30000,
        },
      );
    });

    test("puede guardar una receta", async ({ page }) => {
      const saveButton = page
        .locator(SELECTORS.recommendation.saveRecipeButton)
        .first();

      // Verificar que el botón de guardar existe
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();

        // Verificar mensaje de éxito o cambio de estado
        await page.waitForTimeout(1000);

        // Podría mostrar un toast de éxito
        const toastVisible = await page
          .locator(SELECTORS.notifications.toast)
          .isVisible()
          .catch(() => false);
        expect(toastVisible).toBeTruthy();
      }
    });

    test("puede regenerar una recomendación", async ({ page }) => {
      const regenerateButton = page
        .locator(SELECTORS.recommendation.regenerateButton)
        .first();

      if (await regenerateButton.isVisible().catch(() => false)) {
        await regenerateButton.click();

        // Verificar que se muestra nueva recomendación
        await page.waitForSelector(
          SELECTORS.recommendation.recommendationResult,
          {
            state: "visible",
            timeout: 30000,
          },
        );

        await expect(
          page.locator(SELECTORS.recommendation.mealCard).first(),
        ).toBeVisible();
      }
    });
  });

  test.describe("Navegación desde recomendación", () => {
    test("puede navegar al perfil desde la pantalla de recomendación", async ({
      page,
    }) => {
      await page.click(SELECTORS.bottomNav.profile);

      await expect(page).toHaveURL(/.*profile.*/);
      await expect(
        page.locator(SELECTORS.profile.userName).first(),
      ).toBeVisible();
    });

    test("puede navegar a la despensa desde la pantalla de recomendación", async ({
      page,
    }) => {
      await page.click(SELECTORS.bottomNav.pantry);

      await expect(page).toHaveURL(/.*pantry.*/);
    });

    test("puede navegar al plan desde la pantalla de recomendación", async ({
      page,
    }) => {
      await page.click(SELECTORS.bottomNav.plan);

      await expect(page).toHaveURL(/.*plan.*/);
    });
  });
});
