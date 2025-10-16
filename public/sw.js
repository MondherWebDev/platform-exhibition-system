// Service Worker for Smart Event Management Platform
const CACHE_NAME = 'event-platform-v2';
const STATIC_CACHE = 'event-platform-static-v2';
const DYNAMIC_CACHE = 'event-platform-dynamic-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico',
];

// Assets to cache on demand
const CACHE_STRATEGY = {
  '/api/': 'networkFirst',
  '/_next/static/': 'cacheFirst',
  '/_next/image': 'cacheFirst',
  '/dashboard': 'networkFirst',
  '/e/': 'networkFirst',
  '.css': 'cacheFirst',
  '.js': 'cacheFirst',
  '.png': 'cacheFirst',
  '.jpg': 'cacheFirst',
  '.jpeg': 'cacheFirst',
  '.svg': 'cacheFirst',
  '.woff': 'cacheFirst',
  '.woff2': 'cacheFirst',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Determine caching strategy
  const strategy = getCacheStrategy(request.url);

  event.respondWith(
    handleRequest(request, strategy)
  );
});

// Get caching strategy for URL
function getCacheStrategy(url) {
  for (const [pattern, strategy] of Object.entries(CACHE_STRATEGY)) {
    if (url.includes(pattern)) {
      return strategy;
    }
  }
  return 'networkFirst'; // Default strategy
}

// Handle request based on strategy
async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return networkFirst(request);
  }
}

// Cache First Strategy - good for static assets
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline - Static asset not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network First Strategy - good for dynamic content
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/');
      return offlineResponse || new Response('You are offline. Please check your connection.', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }

    throw error;
  }
}

// Stale While Revalidate - good for frequently updated content
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);

  return cached || networkPromise;
}

// Background sync for check-ins when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'checkin-sync') {
    event.waitUntil(syncCheckIns());
  }
});

async function syncCheckIns() {
  try {
    // Get pending check-ins from IndexedDB
    const pendingCheckIns = await getPendingCheckIns();

    for (const checkIn of pendingCheckIns) {
      try {
        const response = await fetch('/api/checkins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(checkIn),
        });

        if (response.ok) {
          await removePendingCheckIn(checkIn.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync check-in:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View Event',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Helper functions for IndexedDB (for offline check-ins)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EventPlatform', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingCheckIns')) {
        db.createObjectStore('pendingCheckIns', { keyPath: 'id' });
      }
    };
  });
}

async function getPendingCheckIns() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingCheckIns'], 'readonly');
      const store = transaction.objectStore('pendingCheckIns');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('[SW] Error getting pending check-ins:', error);
    return [];
  }
}

async function removePendingCheckIn(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingCheckIns'], 'readwrite');
      const store = transaction.objectStore('pendingCheckIns');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('[SW] Error removing pending check-in:', error);
  }
}

console.log('[SW] Service worker loaded successfully');
