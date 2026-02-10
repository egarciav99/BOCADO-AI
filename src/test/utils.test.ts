import { describe, it, expect } from 'vitest';
import { sanitizeProfileData, separateUserData } from '../utils/profileSanitizer';
import { FormData } from '../types';

describe('Profile Sanitizer', () => {
  describe('sanitizeProfileData', () => {
    it('should return default values for null input', () => {
      const result = sanitizeProfileData(null);
      expect(result.gender).toBe('Hombre');
      expect(result.allergies).toEqual(['Ninguna']);
      expect(result.diseases).toEqual(['Ninguna']);
    });

    it('should sanitize numeric strings', () => {
      const input = {
        weight: 70.5,
        height: '175',
        age: 25,
      };
      
      const result = sanitizeProfileData(input);
      expect(result.weight).toBe('70.5');
      expect(result.height).toBe('175');
      expect(result.age).toBe('25');
    });

    it('should handle invalid numbers', () => {
      const input = {
        weight: 'invalid',
        height: null,
      };
      
      const result = sanitizeProfileData(input);
      expect(result.weight).toBe('');
      expect(result.height).toBe('');
    });

    it('should ensure arrays have default values', () => {
      const input = {
        allergies: [],
        diseases: [],
        dislikedFoods: [],
        nutritionalGoal: [],
      };
      
      const result = sanitizeProfileData(input);
      expect(result.allergies).toEqual(['Ninguna']);
      expect(result.diseases).toEqual(['Ninguna']);
      expect(result.dislikedFoods).toEqual(['Ninguno']);
      expect(result.nutritionalGoal).toEqual(['Sin especificar']);
    });
  });

  describe('separateUserData', () => {
    it('should separate auth data from profile data', () => {
      const formData: FormData = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'secret123',
        confirmPassword: 'secret123',
        gender: 'Hombre',
        age: '25',
        country: 'MX',
        city: 'CDMX',
        diseases: ['Ninguna'],
        allergies: ['Ninguna'],
        otherAllergies: '',
        eatingHabit: 'Omnívoro',
        activityLevel: 'Moderado',
        otherActivityLevel: '',
        activityFrequency: '3 veces',
        nutritionalGoal: ['Salud'],
        cookingAffinity: 'Media',
        dislikedFoods: ['Ninguno'],
      };

      const { auth, profile } = separateUserData(formData);

      expect(auth.firstName).toBe('Juan');
      expect(auth.email).toBe('juan@example.com');
      expect(auth.password).toBe('secret123');
      expect(profile.gender).toBe('Hombre');
      expect(profile.city).toBe('CDMX');
    });
  });
});
