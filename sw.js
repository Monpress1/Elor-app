/* --- ELOR SERVICE WORKER --- */
// 1. OneSignal Import (Must be at the top)
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'elor-cache-v1';
const assets = [
    '/', 
    '/index.html', 
    '/About.html', 
    '/contact.html', 
    '/elor.png'
];

self.addEventListener('install', event => {
    console.log('[SW] Install: Caching luxury assets');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate: Taking control of the Atelier');
    event.waitUntil(clients.claim()); 
});

// Message listener for internal notifications
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(event.data.title, event.data.options);
    }
});

// Fetch event (Satisfies PWA Offline requirement)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                // Return cached index if network fails
                return caches.match('/index.html');
            });
        })
    );
});

// 2. NATIVE SUPABASE PUSH LISTENER (Added for your custom backend integration)
self.addEventListener('push', event => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        
        // Only handle the push event if it came from our custom Supabase structure
        // This ensures it doesn't conflict with any background operations from OneSignal
        if (data.title || data.body) {
            const title = data.title || 'ELOR Atelier';
            const options = {
                body: data.body || 'You have received a bespoke notification.',
                icon: '/elor.png',
                badge: '/elor.png', 
                vibrate: [200, 100, 200],
                data: {
                    url: data.url || '/orders.html'
                }
            };

            event.waitUntil(
                self.registration.showNotification(title, options)
            );
        }
    } catch (err) {
        console.error('[SW] Error processing push event data:', err);
    }
});

// 3. ENHANCED CLICK LISTENER (Handles routing for custom links gracefully)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Check if the notification contains our custom data object link
    const targetUrl = event.notification.data && event.notification.data.url 
        ? event.notification.data.url 
        : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If an app tab is already open, change its path to the notification URL and bring it up
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    return client.navigate(targetUrl).then(c => c.focus());
                }
            }
            // If no windows are active, open a brand new window straight to the target link
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
