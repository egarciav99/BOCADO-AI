// Encrypted storage utility for sensitive data in localStorage
// Uses a simple XOR encryption - NOT for highly sensitive data like passwords
// For production apps with truly sensitive data, use a proper encryption library

import { logger } from './logger';

// Generate a key from the user's browser fingerprint + a salt
// This makes it harder (but not impossible) to read the data from another browser
const getEncryptionKey = (): string => {
  const salt = 'bocado-ai-storage-v1';
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  const str = fingerprint + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36).padStart(16, '0');
};

// XOR encryption (sufficient for obfuscation, NOT for security-critical data)
const xorEncrypt = (text: string, key: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result); // Base64 encode
};

const xorDecrypt = (encoded: string, key: string): string | null => {
  try {
    const text = atob(encoded); // Base64 decode
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch (e) {
    return null;
  }
};

export const encryptedStorage = {
  getItem: (key: string): string | null => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      // Check if data is encrypted (starts with 'enc:')
      if (encrypted.startsWith('enc:')) {
        const key_str = getEncryptionKey();
        const decrypted = xorDecrypt(encrypted.slice(4), key_str);
        return decrypted;
      }
      
      // Legacy: return as-is (for migration)
      return encrypted;
    } catch (e) {
      logger.error('Error reading from encrypted storage', e);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      const key_str = getEncryptionKey();
      const encrypted = 'enc:' + xorEncrypt(value, key_str);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      logger.error('Error writing to encrypted storage', e);
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      logger.error('Error removing from encrypted storage', e);
    }
  },
};

// Storage wrapper that falls back to regular localStorage if encryption fails
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return encryptedStorage.getItem(key);
    } catch {
      return localStorage.getItem(key);
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      encryptedStorage.setItem(key, value);
    } catch {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    try {
      encryptedStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};

export default encryptedStorage;
