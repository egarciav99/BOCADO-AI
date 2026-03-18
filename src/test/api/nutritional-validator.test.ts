import NutritionalValidator, {
  RestrictionFilters,
  NutritionalLimits,
  FoodItem,
} from "../../src/lib/api/services/nutritional-validator";

describe("NutritionalValidator", () => {
  describe("buildFiltersFromProfile", () => {
    it("should build filters correctly from user profile", () => {
      const profile = {
        allergies: ["Vegano", "Celíaco"],
        diseases: ["Diabetes", "Hipertensión"],
      };

      const filters = NutritionalValidator.buildFiltersFromProfile(profile);

      expect(filters.vegano).toBe(true);
      expect(filters.celiaco).toBe(true);
      expect(filters.diabetes).toBe(true);
      expect(filters.hipertension).toBe(true);
      expect(filters.vegetariano).toBe(false);
    });

    it("should handle empty allergies and diseases", () => {
      const profile = { allergies: [], diseases: [] };
      const filters = NutritionalValidator.buildFiltersFromProfile(profile);

      Object.values(filters).forEach((val) => {
        expect(val).toBe(false);
      });
    });

    it("should handle missing allergies/diseases fields", () => {
      const profile = {};
      const filters = NutritionalValidator.buildFiltersFromProfile(profile);

      Object.values(filters).forEach((val) => {
        expect(val).toBe(false);
      });
    });
  });

  describe("buildNutritionalLimits", () => {
    it("should set limits for hypertension", () => {
      const filters: RestrictionFilters = {
        ...Object.keys(new NutritionalValidator.constructor()).reduce(
          (acc: any, key) => ({ ...acc, [key]: false }),
          {},
        ),
        hipertension: true,
      };

      const limits = NutritionalValidator.buildNutritionalLimits(filters);
      expect(limits.maxSodium).toBe(140);
    });

    it("should set limits for diabetes", () => {
      const filters: RestrictionFilters = {
        ...Object.keys(new NutritionalValidator.constructor()).reduce(
          (acc: any, key) => ({ ...acc, [key]: false }),
          {},
        ),
        diabetes: true,
      };

      const limits = NutritionalValidator.buildNutritionalLimits(filters);
      expect(limits.maxGlycoIndex).toBe(55);
      expect(limits.maxSugars).toBe(10);
    });
  });

  describe("isVegan", () => {
    it("should identify vegan foods correctly", () => {
      const veganFood: FoodItem = {
        food_name: "Ensalada de quinua",
        food_type: "Vegetable-based",
      };

      expect(NutritionalValidator.isVegan(veganFood)).toBe(true);
    });

    it("should reject non-vegan foods", () => {
      const nonVeganFood: FoodItem = {
        food_name: "Pollo al horno",
        food_type: "Meat",
      };

      expect(NutritionalValidator.isVegan(nonVeganFood)).toBe(false);
    });

    it("should reject dairy products for vegans", () => {
      const dairyFood: FoodItem = {
        food_name: "Queso fresco",
        food_type: "Dairy",
      };

      expect(NutritionalValidator.isVegan(dairyFood)).toBe(false);
    });
  });

  describe("hasGluten", () => {
    it("should identify gluten-containing foods", () => {
      const glutenFood: FoodItem = {
        food_name: "Pan integral",
        food_type: "Grain",
      };

      expect(NutritionalValidator.hasGluten(glutenFood)).toBe(true);
    });

    it("should identify gluten-free foods", () => {
      const glutenFreeFood: FoodItem = {
        food_name: "Arroz blanco",
        food_type: "Grain",
      };

      expect(NutritionalValidator.hasGluten(glutenFreeFood)).toBe(false);
    });
  });

  describe("containsDairy", () => {
    it("should identify dairy products", () => {
      const dairyFood: FoodItem = {
        food_name: "Yogur griego",
        food_type: "Dairy",
      };

      expect(NutritionalValidator.containsDairy(dairyFood)).toBe(true);
    });

    it("should identify non-dairy foods", () => {
      const nonDairyFood: FoodItem = {
        food_name: "Leche de almendras",
        food_type: "Plant-based",
      };

      expect(NutritionalValidator.containsDairy(nonDairyFood)).toBe(false);
    });
  });

  describe("isSeafood", () => {
    it("should identify seafood items", () => {
      const seafood: FoodItem = {
        food_name: "Salmón a la mantequilla",
        food_type: "Fish",
      };

      expect(NutritionalValidator.isSeafood(seafood)).toBe(true);
    });

    it("should identify non-seafood items", () => {
      const nonSeafood: FoodItem = {
        food_name: "Pechuga de pollo",
        food_type: "Poultry",
      };

      expect(NutritionalValidator.isSeafood(nonSeafood)).toBe(false);
    });
  });

  describe("hasTreeNuts", () => {
    it("should identify tree nuts", () => {
      const nutFood: FoodItem = {
        food_name: "Almendras tostadas",
        food_type: "Nuts",
      };

      expect(NutritionalValidator.hasTreeNuts(nutFood)).toBe(true);
    });

    it("should identify non-nut foods", () => {
      const nonNutFood: FoodItem = {
        food_name: "Manzana roja",
        food_type: "Fruit",
      };

      expect(NutritionalValidator.hasTreeNuts(nonNutFood)).toBe(false);
    });
  });

  describe("validateFood", () => {
    it("should pass validation for compatible foods", () => {
      const food: FoodItem = {
        food_name: "Brócoli al vapor",
        food_type: "Vegetable",
      };

      const filters: RestrictionFilters = {
        vegano: false,
        vegetariano: false,
        celiaco: false,
        sinLactosa: false,
        sinMariscos: false,
        sinFrutosSecos: false,
        diabetes: false,
        hipertension: false,
        colesterol: false,
        hipotiroidismo: false,
        hipertiroidismo: false,
        intestinoIritable: false,
      };

      const limits: NutritionalLimits = {};

      const result = NutritionalValidator.validateFood(food, filters, limits);
      expect(result.valid).toBe(true);
    });

    it("should reject non-vegan foods for vegan users", () => {
      const food: FoodItem = {
        food_name: "Pechuga de pollo",
        food_type: "Meat",
      };

      const filters: RestrictionFilters = {
        vegano: true,
        vegetariano: false,
        celiaco: false,
        sinLactosa: false,
        sinMariscos: false,
        sinFrutosSecos: false,
        diabetes: false,
        hipertension: false,
        colesterol: false,
        hipotiroidismo: false,
        hipertiroidismo: false,
        intestinoIritable: false,
      };

      const limits: NutritionalLimits = {};

      const result = NutritionalValidator.validateFood(food, filters, limits);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("not_vegan");
    });

    it("should validate nutritional limits when available", () => {
      const food: FoodItem = {
        food_name: "Caldo de pollo",
        food_type: "Soup",
        nutrition: {
          sodium_mg: 200,
        },
      };

      const filters: RestrictionFilters = {
        vegano: false,
        vegetariano: false,
        celiaco: false,
        sinLactosa: false,
        sinMariscos: false,
        sinFrutosSecos: false,
        diabetes: false,
        hipertension: true,
        colesterol: false,
        hipotiroidismo: false,
        hipertiroidismo: false,
        intestinoIritable: false,
      };

      const limits: NutritionalLimits = {
        maxSodium: 140,
      };

      const result = NutritionalValidator.validateFood(food, filters, limits);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("high_sodium");
    });
  });

  describe("filterFoods", () => {
    it("should filter a list of foods correctly", () => {
      const foods: FoodItem[] = [
        { food_name: "Ensalada de verduras", food_type: "Salad" },
        { food_name: "Pollo a la parrilla", food_type: "Meat" },
        { food_name: "Arroz blanco", food_type: "Grain" },
        { food_name: "Queso cheddar", food_type: "Dairy" },
      ];

      const filters: RestrictionFilters = {
        vegano: true,
        vegetariano: false,
        celiaco: false,
        sinLactosa: false,
        sinMariscos: false,
        sinFrutosSecos: false,
        diabetes: false,
        hipertension: false,
        colesterol: false,
        hipotiroidismo: false,
        hipertiroidismo: false,
        intestinoIritable: false,
      };

      const limits: NutritionalLimits = {};

      const result = NutritionalValidator.filterFoods(foods, filters, limits);

      expect(result.filtered.length).toBeGreaterThan(0);
      expect(result.filtered.length).toBeLessThan(foods.length);
      expect(result.removed.length).toBeGreaterThan(0);
    });
  });
});
