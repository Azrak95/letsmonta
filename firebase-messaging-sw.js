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

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/letsmonta/app_icon.png',
    badge: '/letsmonta/app_icon.png',
    vibrate: [200, 100, 200],
    data: { url: 'https://azrak95.github.io/letsmonta/' }
  });
});

// Al pulsar la notificación, abre la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://azrak95.github.io/letsmonta/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si la app ya está abierta, ponla en foco
      for (const client of clientList) {
        if (client.url.includes('azrak95.github.io/letsmonta') && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no está abierta, ábrela
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
