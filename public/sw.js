const CACHE_NAME = 'net4sats-v1';
const ASSETS = [
  '/net4sats/',
  '/net4sats/index.html',
  '/net4sats/assets/',
  '/net4sats/assets/icon/colour/net4sats-icon-colour.png',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Fetch event - cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  // Network-first for /ubus calls (always fresh API data)
  if (event.request.url.includes('/ubus')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fallback to cached version if offline
          return caches.match(event.request).then((cached) => cached || new Response('Network error', { status: 0 }));
        })
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
