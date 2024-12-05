// Service Worker Configuration
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
function isApiCall(request) {
  return request.url.includes('/api/') || 
         request.url.includes('generativelanguage.googleapis.com');
}

// Function to check if a request is a navigation
function isNavigation(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

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
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin) && !isApiCall(request)) {
    return;
  }

  // API calls should not be cached
  if (isApiCall(request)) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first strategy for navigation requests
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, clonedResponse));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => response || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, clonedResponse));
            return response;
          })
          .catch((err) => {
            console.error('[Service Worker] Fetch failed:', err);
            return new Response('Network error', { status: 408, statusText: 'Network error' });
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
