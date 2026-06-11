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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  // iOS recibe el campo notification directamente del servidor — no hacer nada aquí
  // Android/PC reciben solo data — el SW muestra la notificación
  const title = payload.data?.title;
  const body = payload.data?.body;
  if (!title) return; // iOS no tiene payload.data.title, sale aquí

  self.registration.showNotification(title, {
    body,
    icon: '/letsmonta/app_icon.png',
    badge: '/letsmonta/app_icon.png',
    vibrate: [200, 100, 200],
  });
});
