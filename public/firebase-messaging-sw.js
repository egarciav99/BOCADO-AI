// Bocado AI - Service Worker Completo
// Maneja: Notificaciones push + Caching offline

// ============================================
// SECCIÓN 1: FIREBASE MESSAGING (existente)
// ============================================
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
  authDomain: self.__FIREBASE_CONFIG__?.authDomain || '',
  projectId: self.__FIREBASE_CONFIG__?.projectId || '',
  storageBucket: self.__FIREBASE_CONFIG__?.storageBucket || '',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
  appId: self.__FIREBASE_CONFIG__?.appId || '',
};

// Inicializar Firebase
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Manejar mensajes en segundo plano
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);

    const notificationTitle = payload.notification?.title || 'Bocado';
    const notificationOptions = {
      body: payload.notification?.body || 'Tienes una nueva notificación',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: payload.data?.type || 'default',
      requireInteraction: false,
      data: payload.data,
      actions: [
        {
          action: 'open',
          title: 'Abrir app'
        }
      ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificación clickeada:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Manejar notificación cerrada sin clic
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notificación cerrada:', event);
});

// ============================================
// SECCIÓN 2: CACHING OFFLINE (nuevo)
// ============================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `bocado-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `bocado-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `bocado-images-${CACHE_VERSION}`;

// Assets críticos para precache
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalación: Precachear assets críticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precacheando assets críticos');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Precache completado');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Error en precache:', err);
      })
  );
});

// Activación: Limpiar caches antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('bocado-') && !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Eliminando cache antigua:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activado');
        return self.clients.claim();
      })
  );
});

// Estrategia: Cache First para assets estáticos
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Error en cacheFirst:', error);
    throw error;
  }
}

// Estrategia: Network First para API calls
async function networkFirst(request, cacheName, networkTimeout = 5000) {
  const cache = await caches.open(cacheName);
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), networkTimeout);
    });
    
    const response = await Promise.race([fetch(request), timeoutPromise]);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network falló, intentando cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Si es una navegación y no hay cache, retornar página offline
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Estrategia: Stale While Revalidate para imágenes
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

// Fetch event: Aplicar estrategias según el tipo de request
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests no GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar requests de Firebase Analytics y otros servicios de analytics
  if (url.hostname.includes('google-analytics') || 
      url.hostname.includes('analytics') ||
      url.pathname.includes('chrome-extension')) {
    return;
  }

  // Estrategia para assets estáticos (JS, CSS)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Estrategia para imágenes
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }
  
  // Estrategia para fuentes
  if (url.pathname.match(/\.(woff2?|ttf|otf)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Estrategia para APIs de Firebase y otros servicios
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('firebaseio.com')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 8000));
    return;
  }
  
  // Estrategia para navegación (páginas)
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE, 3000)
        .catch(async () => {
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline', { status: 503 });
        })
    );
    return;
  }
  
  // Default: Network first con fallback a cache
  event.respondWith(
    networkFirst(request, DYNAMIC_CACHE).catch(() => cacheFirst(request, STATIC_CACHE))
  );
});

// ============================================
// SECCIÓN 3: SYNC Y PUSH (futuras mejoras)
// ============================================

// Escuchar mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});
