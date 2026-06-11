importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAg6VpZZSlfS7zXuH8aklndJKgLlM1SmCM",
  authDomain: "letsmonta.firebaseapp.com",
  databaseURL: "https://letsmonta-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "letsmonta",
  storageBucket: "letsmonta.firebasestorage.app",
  messagingSenderId: "827368602785",
  appId: "1:827368602785:web:d6df974b604243579d04e0"
});

// Activar el nuevo SW inmediatamente sin esperar a que se cierren las pestañas
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  // iOS muestra la notificación automáticamente — no la mostramos aquí para evitar duplicado
  const isIOS = /iphone|ipad|ipod/i.test(self.navigator?.userAgent || '');
  if (isIOS) return;

  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/letsmonta/app_icon.png',
    badge: '/letsmonta/app_icon.png',
    vibrate: [200, 100, 200],
  });
});
