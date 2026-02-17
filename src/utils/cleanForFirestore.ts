/**
 * Limpia un objeto para Firestore: convierte undefined → null recursivamente.
 * Firestore no acepta undefined pero sí acepta null.
 *
 * Uso:
 * ```ts
 * import { cleanForFirestore } from '../utils/cleanForFirestore';
 * await setDoc(docRef, cleanForFirestore(data), { merge: true });
 * ```
 */
export const cleanForFirestore = (obj: Record<string, any>): Record<string, any> => {
  const cleanValue = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const cleanedObj: Record<string, any> = {};
      Object.keys(value).forEach(k => {
        cleanedObj[k] = cleanValue(value[k]);
      });
      return cleanedObj;
    }
    return value;
  };

  const cleaned: Record<string, any> = { ...obj };
  Object.keys(cleaned).forEach(key => {
    cleaned[key] = cleanValue(cleaned[key]);
  });
  return cleaned;
};
