/**
 * Utilidades para generar usuarios de prueba
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle';
  dietType?: 'balanced' | 'vegetarian' | 'vegan' | 'keto' | 'mediterranean';
  allergies?: string[];
  intolerances?: string[];
}

/**
 * Genera un usuario de prueba único con datos aleatorios
 */
export function generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  return {
    email: `test-${timestamp}-${randomStr}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    birthDate: '1990-01-01',
    gender: 'male',
    height: 175,
    weight: 70,
    activityLevel: 'moderate',
    goal: 'maintain',
    dietType: 'balanced',
    allergies: [],
    intolerances: [],
    ...overrides,
  };
}

/**
 * Genera un usuario de prueba para un flujo completo de registro
 */
export function generateTestUserForRegistration(overrides: Partial<TestUser> = {}): TestUser {
  return generateTestUser({
    firstName: 'Carlos',
    lastName: 'García',
    birthDate: '1985-06-15',
    gender: 'male',
    height: 180,
    weight: 75,
    activityLevel: 'moderate',
    goal: 'lose_weight',
    dietType: 'mediterranean',
    ...overrides,
  });
}

/**
 * Usuario fijo para tests de login (ya debe existir en Firebase)
 * Nota: Este usuario debe ser creado previamente en el entorno de test
 */
export const FIXED_TEST_USER: TestUser = {
  email: 'e2e-test-user@bocado.test',
  password: 'TestPass123!',
  firstName: 'E2E',
  lastName: 'Test',
};

/**
 * Credenciales inválidas para tests de error
 */
export const INVALID_CREDENTIALS = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
};
