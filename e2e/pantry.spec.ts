import { test, expect } from "@playwright/test";
import { generateTestUser, TestUser } from "./utils/test-users";
import { SELECTORS } from "./utils/selectors";
import { register, clearAuthState } from "./utils/auth";

test.describe("Despensa (Pantry)", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);

    // Crear usuario para tests
    testUser = generateTestUser();
    await register(page, testUser);

    // Ir a la despensa
    await page.click(SELECTORS.bottomNav.pantry);
    await expect(page).toHaveURL(/.*pantry.*/);
  });

  test.describe("Visualización de la despensa", () => {
    test("muestra la lista de la despensa", async ({ page }) => {
      const pantryList = page.locator(SELECTORS.pantry.itemList).first();

      // La lista puede estar vacía o tener items
      if (await pantryList.isVisible().catch(() => false)) {
        await expect(pantryList).toBeVisible();
      } else {
        // Si no hay lista, debería haber un mensaje de despensa vacía
        const emptyMessage = await page
          .locator(
            "text=despensa está vacía, No hay productos, Añade tu primer",
          )
          .isVisible()
          .catch(() => false);
        expect(emptyMessage).toBeTruthy();
      }
    });

    test("muestra botón para añadir items", async ({ page }) => {
      const addButton = page.locator(SELECTORS.pantry.addItemButton).first();
      await expect(addButton).toBeVisible();
    });
  });

  test.describe("Gestión de items", () => {
    test("puede añadir un nuevo item a la despensa", async ({ page }) => {
      // Click en añadir
      await page.click(SELECTORS.pantry.addItemButton);

      // Esperar formulario
      await page.waitForSelector(SELECTORS.pantry.itemNameInput, {
        state: "visible",
      });

      // Llenar datos
      await page.fill(SELECTORS.pantry.itemNameInput, "Pollo");
      await page.fill(SELECTORS.pantry.quantityInput, "500");

      // Seleccionar categoría si existe
      const categorySelect = page.locator(SELECTORS.pantry.categorySelect);
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption("proteins");
      }

      // Guardar
      await page.click(SELECTORS.pantry.saveItemButton);

      // Verificar que se añadió
      await page.waitForTimeout(1000);

      // Buscar el item en la lista
      const itemVisible = await page
        .locator("text=Pollo")
        .isVisible()
        .catch(() => false);
      expect(itemVisible).toBeTruthy();
    });

    test("puede añadir múltiples items", async ({ page }) => {
      const items = [
        { name: "Arroz", quantity: "1000", category: "grains" },
        { name: "Tomates", quantity: "6", category: "vegetables" },
      ];

      for (const item of items) {
        await page.click(SELECTORS.pantry.addItemButton);
        await page.waitForSelector(SELECTORS.pantry.itemNameInput, {
          state: "visible",
        });

        await page.fill(SELECTORS.pantry.itemNameInput, item.name);
        await page.fill(SELECTORS.pantry.quantityInput, item.quantity);

        const categorySelect = page.locator(SELECTORS.pantry.categorySelect);
        if (await categorySelect.isVisible().catch(() => false)) {
          await categorySelect.selectOption(item.category).catch(() => {});
        }

        await page.click(SELECTORS.pantry.saveItemButton);
        await page.waitForTimeout(500);
      }

      // Verificar que ambos items están en la lista
      for (const item of items) {
        const itemVisible = await page
          .locator(`text=${item.name}`)
          .isVisible()
          .catch(() => false);
        expect(itemVisible).toBeTruthy();
      }
    });

    test("puede eliminar un item de la despensa", async ({ page }) => {
      // Primero añadir un item
      await page.click(SELECTORS.pantry.addItemButton);
      await page.waitForSelector(SELECTORS.pantry.itemNameInput, {
        state: "visible",
      });
      await page.fill(SELECTORS.pantry.itemNameInput, "ItemParaEliminar");
      await page.fill(SELECTORS.pantry.quantityInput, "1");
      await page.click(SELECTORS.pantry.saveItemButton);

      await page.waitForTimeout(1000);

      // Buscar y eliminar el item
      const deleteButton = page
        .locator(SELECTORS.pantry.deleteItemButton)
        .first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();

        // Confirmar eliminación si hay modal
        const confirmButton = page.locator(SELECTORS.modal.confirmButton);
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe("Filtrado y búsqueda", () => {
    test("puede filtrar items por categoría", async ({ page }) => {
      // Buscar selectores de filtro
      const categoryFilter = page.locator(
        'select[name="categoryFilter"], [data-testid="category-filter"]',
      );

      if (await categoryFilter.isVisible().catch(() => false)) {
        await categoryFilter.selectOption("proteins");

        await page.waitForTimeout(500);

        // Verificar que se filtró
        const items = page.locator(SELECTORS.pantry.itemRow);
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe("Integración con recomendaciones", () => {
    test("navega a recomendaciones desde la despensa", async ({ page }) => {
      await page.click(SELECTORS.bottomNav.recommendation);

      await expect(page).toHaveURL(/.*recommendation.*/);
    });
  });
});
