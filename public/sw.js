const CACHE_NAME = 'cidadela-pracinha-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Não interceptar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Não interceptar requisições para API ou outros domínios
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Não interceptar manifest.json (causa erro CORS)
  if (event.request.url.includes('/manifest.json')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Não cachear respostas que não são ok
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clonar a resposta pois ela só pode ser consumida uma vez
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Cachear apenas recursos estáticos
          if (event.request.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
            cache.put(event.request, responseToCache).catch(() => {
              // Ignorar erro de cache
            });
          }
        }).catch(() => {
          // Ignorar erro ao abrir cache
        });

        return response;
      }).catch(() => {
        // Se falhar, tentar retornar do cache mesmo que antigo
        return caches.match(event.request);
      });
    }).catch(() => {
      // Se falhar, tentar retornar do cache mesmo que antigo
      return caches.match(event.request);
    })
  );
});