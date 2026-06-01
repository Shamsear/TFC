const CACHE_NAME = 'tfc-v1.0.2';
const OFFLINE_ASSETS = [
  '/offline.html',
  '/android-chrome-192x192.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline assets shell');
      return cache.addAll(OFFLINE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache storage:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Prevent SW from intercepting/caching API routes, auth routes, or non-GET requests
  if (
    event.request.method !== 'GET' || 
    !event.request.url.startsWith(self.location.origin) ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/auth/')
  ) {
    return;
  }

  // CRITICAL: Never cache the root path to allow proper authentication redirects
  if (url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // For all other requests, use network-first strategy with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Don't cache redirects (3xx status codes)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If it's a navigation request and no cache, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: payload.url || '/team'
      }
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (error) {
    console.error('[SW] Error rendering background notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data.url;
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Version skip waiting message hook
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
