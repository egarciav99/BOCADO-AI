const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (typeof value === 'undefined') {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

const apiConfig = {
  registerUserUrl: getEnvVar('VITE_REGISTER_USER_URL'),
  webhookUrls: [
    getEnvVar('VITE_WEBHOOK_URL_TEST'),
    getEnvVar('VITE_WEBHOOK_URL_PROD'),
  ]
};

export const env = Object.freeze({
  firebase: firebaseConfig,
  api: apiConfig,
});
