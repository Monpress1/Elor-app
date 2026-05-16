
// --- ELOR ATELIER PRODUCTION SERVICE WORKER ---

const CACHE_NAME = 'elor-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/account.html',
  '/orders.html',
  '/auth.html',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&family=Playfair+Display:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. Install Event: Cache essential shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Force the waiting service worker to become the active service worker immediately
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean up old caches and claim clients instantly
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Allow the active service worker to set itself as the controller for all open clients
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: Network-first falling back to cache strategy
self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP/HTTPS requests (ignores chrome-extension or supabase schemes)
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid network response, clone it into cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network is down/unreachable, look into local cache
        return caches.match(event.request);
      })
  );
});

// 4. Push Event: Handle incoming web-push payloads elegantly
self.addEventListener('push', (event) => {
  let pushData = {
    title: 'ELOR Atelier',
    body: 'Your bespoke order updates are ready to view.',
    icon: '/icons/icon-192x192.png', // Ensure this asset path is correct in your public directory
    badge: '/icons/icon-72x72.png'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      pushData = {
        title: parsed.title || pushData.title,
        body: parsed.body || pushData.body,
        icon: parsed.icon || pushData.icon,
        badge: parsed.badge || pushData.badge,
        data: parsed.data || {}
      };
    } catch (e) {
      // Fallback if the data payload sent from the backend server is plain text instead of JSON
      pushData.body = event.data.text();
    }
  }

  const options = {
    body: pushData.body,
    icon: pushData.icon,
    badge: pushData.badge,
    vibrate: [200, 100, 200],
    data: pushData.data,
    actions: [
      { action: 'view_orders', title: 'View Order' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(pushData.title, options)
  );
});

// 5. Notification Click Action Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Look for open browser windows and focus or navigate to them
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/orders') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/orders.html');
      }
    })
  );
});
