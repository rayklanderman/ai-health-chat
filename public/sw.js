const CACHE_NAME = 'ai-health-assistant-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/offline.html'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Precaching App Shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(
    caches.keys()
      .then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients for version');
        return self.clients.claim();
      })
  );
});

// Fetch Event Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((res) => {
            return caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                // Check if request is for same origin
                if (event.request.url.indexOf(self.origin) === 0) {
                  cache.put(event.request.url, res.clone());
                }
                return res;
              })
          })
          .catch((err) => {
            return caches.open(STATIC_CACHE)
              .then((cache) => {
                if (event.request.headers.get('accept').includes('text/html')) {
                  return cache.match('/offline.html');
                }
              });
          });
      })
  );
});
