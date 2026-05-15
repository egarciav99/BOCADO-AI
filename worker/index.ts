/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Firebase Messaging — importar compat para background messages
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// @ts-ignore
firebase.initializeApp({
  apiKey: "AIzaSyCmHr6PmGGxfVEqSTihxWoXK4UUYz1NmRg",
  authDomain: "bocado-ai.firebaseapp.com",
  projectId: "bocado-ai",
  storageBucket: "bocado-ai.firebasestorage.app",
  messagingSenderId: "990221792293",
  appId: "1:990221792293:web:83ae4624bb09938b4abbcc",
});

// @ts-ignore
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload: any) => {
  const title = payload.notification?.title || payload.data?.title || "Bocado";
  const options = {
    body: payload.notification?.body || payload.data?.body || "Tienes una nueva notificación",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: payload.data?.type || "bocado",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
