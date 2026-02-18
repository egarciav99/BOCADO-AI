import { describe, it, expect } from "vitest";
import { step1Schema, step2Schema, step3Schema } from "../schemas/userSchema";

describe("User Schema Validation", () => {
  describe("step1Schema", () => {
    it("should validate valid user data", () => {
      const validData = {
        firstName: "Juan",
        lastName: "Pérez",
        gender: "Hombre",
        age: "25",
        country: "MX",
        city: "Ciudad de México",
        email: "juan@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      const result = step1Schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject short firstName", () => {
      const invalidData = {
        firstName: "J",
        lastName: "Pérez",
        gender: "Hombre",
        age: "25",
        country: "MX",
        city: "Ciudad de México",
        email: "juan@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      const result = step1Schema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject mismatched passwords", () => {
      const invalidData = {
        firstName: "Juan",
        lastName: "Pérez",
        gender: "Hombre",
        age: "25",
        country: "MX",
        city: "Ciudad de México",
        email: "juan@example.com",
        password: "password123",
        confirmPassword: "different",
      };

      const result = step1Schema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        firstName: "Juan",
        lastName: "Pérez",
        gender: "Hombre",
        age: "25",
        country: "MX",
        city: "Ciudad de México",
        email: "not-an-email",
        password: "password123",
        confirmPassword: "password123",
      };

      const result = step1Schema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("step2Schema", () => {
    it("should validate valid health data", () => {
      const validData = {
        allergies: ["Ninguna"],
        otherAllergies: "",
        nutritionalGoal: ["Perder peso"],
      };

      const result = step2Schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should require at least one nutritional goal", () => {
      const invalidData = {
        allergies: ["Ninguna"],
        otherAllergies: "",
        nutritionalGoal: [],
      };

      const result = step2Schema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("step3Schema", () => {
    it("should validate valid activity data", () => {
      const validData = {
        activityLevel: "Moderado",
        otherActivityLevel: "",
        activityFrequency: "3 veces por semana",
        dislikedFoods: ["Brócoli"],
      };

      const result = step3Schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should require frequency if not sedentary", () => {
      const invalidData = {
        activityLevel: "Activo",
        otherActivityLevel: "",
        activityFrequency: "",
        dislikedFoods: [],
      };

      const result = step3Schema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
