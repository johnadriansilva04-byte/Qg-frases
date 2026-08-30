const CACHE_NAME = 'cidadela-pracinha-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/artes/cidadela-favicon.ico',
  '/artes/cidadela-icon-192.png',
  '/artes/cidadela-icon-512.png',
  '/artes/cidadela-icon-og.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});