const CACHE_NAME = 'messmanager-v1';
const urlsToCache = [
  '/dashboard',
  '/dashboard/master-sheet',
  '/dashboard/meals',
  '/dashboard/bazar',
  '/dashboard/menu',
  '/dashboard/maid-gas',
  '/dashboard/whatsapp',
  '/login'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
