const CACHE = 'letsmonta-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app_icon.png',
  './bg_monta.png',
  './avatars/Monir.png',
  './avatars/Bego.png',
  './avatars/David.png',
  './avatars/Bea.png',
  './avatars/Miriam.png',
  './avatars/Edu.png',
  './avatars/MiriamG.png',
  './avatars/Pincho.png',
  './avatars/Pipe.png',
  './avatars/Sheyla.png',
  './avatars/Maria.png',
  './avatars/Kiki.png',
  './avatars/Idoia.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
