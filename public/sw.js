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
  '/offline.html',
  '/assets/index.css'
];

// Function to check if a request is an API call
const isApiCall = (request) => {
  return request.url.includes('/api/') || 
         request.url.includes('generativelanguage.googleapis.com');
};

// Function to check if a request is a navigation
const isNavigation = (request) => {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
};

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
    // Check if online first
    fetch(event.request)
      .then((response) => {
        // If online, cache the response and return it
        if (!isApiCall(event.request)) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch((err) => {
        // If offline, try to get from cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }

            // If not in cache and it's a navigation request, return offline page
            if (isNavigation(event.request)) {
              return caches.match('/offline.html');
            }

            // If it's an API call, return an error response
            if (isApiCall(event.request)) {
              return new Response(
                JSON.stringify({
                  error: 'You are currently offline. Please check your internet connection.'
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }

            // For other resources, return a simple error response
            return new Response('Offline - Resource not available');
          });
      })
  );
});

// Listen for online/offline events
self.addEventListener('message', (event) => {
  if (event.data === 'CHECK_ONLINE_STATUS') {
    event.ports[0].postMessage({ online: self.navigator.onLine });
  }
});
