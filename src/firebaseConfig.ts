import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  serverTimestamp
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { env } from './environment/env';
import { logger } from './utils/logger';

const app = !getApps().length ? initializeApp(env.firebase) : getApp();

// CONFIGURACIÓN OFFLINE (Firestore Persistence)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// AUTH
const auth = getAuth(app);

// ANALYTICS con manejo de race condition
let analytics: ReturnType<typeof getAnalytics> | null = null;
let analyticsReady = false;
const eventQueue: Array<{ eventName: string; params?: Record<string, any> }> = [];

const processEventQueue = () => {
  if (!analytics) return;
  
  while (eventQueue.length > 0) {
    const event = eventQueue.shift();
    if (event) {
      try {
        logEvent(analytics, event.eventName, event.params);
      } catch (e) {
        // Silenciar errores de analytics
      }
    }
  }
};

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      analyticsReady = true;
      processEventQueue();
      
      if (import.meta.env.DEV) {
        logger.info('✅ Analytics inicializado');
      }
    }
  }).catch((err) => {
    if (import.meta.env.DEV) {
      logger.warn('Analytics no soportado:', err);
    }
  });
}

// Helper para trackear eventos (con cola para race condition)
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (analyticsReady && analytics) {
    try {
      logEvent(analytics, eventName, params);
    } catch (e) {
      // Silenciar errores de analytics
    }
  } else {
    // Encolar evento para procesar cuando analytics esté listo
    eventQueue.push({ eventName, params });
    // Limitar tamaño de cola
    if (eventQueue.length > 100) {
      eventQueue.shift();
    }
  }
};

// Establecer el ID de usuario en Analytics
export const setAnalyticsUser = (userId: string | null) => {
  if (analytics && userId) {
    try {
      setUserId(analytics, userId);
    } catch (e) {
      // Silenciar errores
    }
  }
};

// Establecer propiedades del usuario en Analytics
export const setAnalyticsProperties = (properties: Record<string, any>) => {
  if (analytics) {
    try {
      setUserProperties(analytics, properties);
    } catch (e) {
      // Silenciar errores
    }
  }
};

export { db, auth, serverTimestamp, analytics };
