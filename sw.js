/* =========================
   ELOR SERVICE WORKER v2
   Custom VAPID + Supabase Push
========================= */

// Cache version (IMPORTANT for updates)
const CACHE_NAME = 'elor-cache-v2';

const assets = [
    '/',
    '/index.html',
    '/About.html',
    '/contact.html',
    '/orders.html',
    '/elor.png',
    '/manifest.json'
];

// -------------------- INSTALL --------------------
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

// -------------------- ACTIVATE --------------------
self.addEventListener('activate', event => {
    console.log('[SW] Activated');
    event.waitUntil(self.clients.claim());
});

// -------------------- FETCH (Offline support) --------------------
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                return caches.match('/index.html');
            });
        })
    );
});

// -------------------- PUSH NOTIFICATION --------------------
self.addEventListener('push', event => {
    console.log('[SW] Push received');

    let data = {
        title: "ELOR",
        body: "New update available",
        url: "/orders.html"
    };

    try {
        if (event.data) {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        }
    } catch (err) {
        console.log('[SW] Push data parse error:', err);
    }

    const options = {
        body: data.body,
        icon: '/elor.png',
        badge: '/elor.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// -------------------- NOTIFICATION CLICK --------------------
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// -------------------- MESSAGE HANDLER --------------------
self.addEventListener('message', event => {
    if (!event.data) return;

    if (event.data.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(event.data.title, event.data.options);
    }
});
