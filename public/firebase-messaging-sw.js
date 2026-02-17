// Bocado AI - Firebase Messaging Service Worker
// Solo maneja notificaciones push en background.
// El caching offline lo gestiona Workbox (VitePWA) automáticamente.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configuración de Firebase (hardcoded porque el SW no tiene acceso a import.meta.env)
const firebaseConfig = {
  apiKey: 'AIzaSyCmHr6PmGGxfVEqSTihxWoXK4UUYz1NmRg',
  authDomain: 'bocado-ai.firebaseapp.com',
  projectId: 'bocado-ai',
  storageBucket: 'bocado-ai.firebasestorage.app',
  messagingSenderId: '990221792293',
  appId: '1:990221792293:web:83ae4624bb09938b4abbcc',
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejar mensajes en segundo plano (app cerrada o en background)
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
        title: 'Abrir app',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificación clickeada:', event);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana, abrir una nueva
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
