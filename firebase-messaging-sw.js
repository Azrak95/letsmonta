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
  // iOS muestra la notificación automáticamente — si la mostramos aquí también, llega doble.
  // Android necesita que la mostremos nosotros — si no lo hacemos, no llega.
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
