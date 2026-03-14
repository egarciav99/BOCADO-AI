/**
 * Zod schemas for data validation before Firestore writes
 * Ensures data integrity at the application boundary
 */

import { z } from 'zod';

/**
 * User profile schema - strict validation
 */
export const UserProfileSchema = z.object({
  uid: z.string().min(1, 'UID is required'),
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  emailVerified: z.boolean().optional(),
  
  // Profile fields
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  profileImageUrl: z.string().url().optional(),
  
  // Health & dietary
  allergies: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  otherAllergies: z.string().max(500).optional(),
  eatingHabit: z.string().optional(),
  diseases: z.array(z.string()).optional(),
  
  // Location
  country: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  
  // Preferences
  preferredLanguage: z.string().optional(),
  
  // Timestamps
  createdAt: z.date().or(z.object({ _seconds: z.number() })).optional(),
  updatedAt: z.date().or(z.object({ _seconds: z.number() })).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * User interaction schema - recommendation request
 */
export const UserInteractionSchema = z.object({
  userId: z.string().min(1),
  _id: z.string().min(1).optional(), // ID es asignado por Firestore después de addDoc
  mealType: z.string().min(1).max(100),
  cookingTime: z.number().int().min(1).max(120).nullable().optional(),
  cravings: z.array(z.string()).optional(),
  budget: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  onlyPantryIngredients: z.boolean().optional(),
  language: z.string().length(2).optional(),
  createdAt: z.any().optional(), // Firestore FieldValue, no validamos directamente
  procesado: z.boolean().default(false).optional(),
});

export type UserInteraction = z.infer<typeof UserInteractionSchema>;

/**
 * Saved recipe schema
 */
export const SavedRecipeSchema = z.object({
  user_id: z.string().min(1),
  recipe_id: z.string().min(1),
  title: z.string().min(1).max(200),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  savedAt: z.date().or(z.object({ _seconds: z.number() })).optional(),
});

export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;

/**
 * Notification settings schema
 */
export const NotificationSettingsSchema = z.object({
  uid: z.string().min(1),
  enabled: z.boolean().default(true),
  mealReminders: z.boolean().default(true),
  pantryReminders: z.boolean().default(true),
  engagementReminders: z.boolean().default(true),
  updatedAt: z.date().or(z.object({ _seconds: z.number() })).optional(),
});

export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

/**
 * Rate limit record schema
 */
export const RateLimitRecordSchema = z.object({
  userId: z.string().min(1),
  requests: z.array(z.number()),
  currentProcess: z.object({
    startedAt: z.number(),
    interactionId: z.string(),
  }).nullable().optional(),
  updatedAt: z.date().or(z.object({ _seconds: z.number() })).optional(),
});

export type RateLimitRecord = z.infer<typeof RateLimitRecordSchema>;

/**
 * Safe validation function that returns result object instead of throwing
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Validate or throw with formatted message
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = 'Validation',
): T {
  const result = validateData(schema, data);

  if (!result.success) {
    const errors = result.errors.issues
      .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`${context} failed: ${errors}`);
  }

  return result.data;
}
