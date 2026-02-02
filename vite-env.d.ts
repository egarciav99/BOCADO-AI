// Fix: Manually define types for import.meta.env as vite/client types are not found.
// This resolves the error about vite/client not being found and the error in environment/env.ts
// about 'env' not existing on 'import.meta'.
interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_REGISTER_USER_URL: string;
    readonly VITE_WEBHOOK_URL_TEST: string;
    readonly VITE_WEBHOOK_URL_PROD: string;
    // Add index signature to allow string indexing in getEnvVar
    [key: string]: any;
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
