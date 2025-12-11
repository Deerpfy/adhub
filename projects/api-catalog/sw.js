/**
 * API Catalog - Service Worker
 *
 * Poskytuje offline funkcionalitu pomocí cache strategie.
 * Implementuje "Cache First, Network Fallback" pro statické assety
 * a "Network First, Cache Fallback" pro API data.
 *
 * @version 1.0.0
 * @license MIT
 */

const CACHE_NAME = 'api-catalog-v1.0.0';
const STATIC_CACHE = 'api-catalog-static-v1.0.0';
const DATA_CACHE = 'api-catalog-data-v1.0.0';

// Statické soubory k precache
const STATIC_ASSETS = [
    './',
    './index.html',
    './app.js',
    './db.js',
    './styles.css',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalace - precache statických souborů
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

// Aktivace - vyčištění starých cache
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Smazat cache s jinou verzí
                            return name.startsWith('api-catalog-') &&
                                name !== STATIC_CACHE &&
                                name !== DATA_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch strategie
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorovat non-GET requesty
    if (request.method !== 'GET') {
        return;
    }

    // Ignorovat chrome-extension requesty
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Strategie pro různé typy requestů
    if (isStaticAsset(url)) {
        // Cache First pro statické assety
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (isAPIRequest(url)) {
        // Network First pro API data
        event.respondWith(networkFirst(request, DATA_CACHE));
    } else {
        // Stale While Revalidate pro ostatní
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    }
});

/**
 * Kontroluje zda URL je statický asset
 */
function isStaticAsset(url) {
    const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
        url.pathname.endsWith('/') ||
        url.pathname === '/index.html';
}

/**
 * Kontroluje zda URL je API request
 */
function isAPIRequest(url) {
    return url.pathname.includes('/api/') ||
        url.pathname.endsWith('.json') ||
        url.hostname.includes('api.');
}

/**
 * Cache First strategie
 * Vrátí cached verzi pokud existuje, jinak network
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        console.log('[SW] Cache hit:', request.url);
        return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    try {
        const networkResponse = await fetch(request);

        // Cache pouze úspěšné odpovědi
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Network First strategie
 * Zkusí network, při selhání vrátí cache
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        console.log('[SW] Network first:', request.url);
        const networkResponse = await fetch(request);

        // Cache úspěšné odpovědi
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'Data nejsou dostupná offline'
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale While Revalidate strategie
 * Vrátí cache okamžitě a na pozadí aktualizuje
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Fetch na pozadí
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.log('[SW] Background fetch failed:', error);
            return null;
        });

    // Vrátit cached verzi nebo čekat na network
    return cachedResponse || fetchPromise || new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

// Message handling pro komunikaci s aplikací
self.addEventListener('message', (event) => {
    const { action, data } = event.data || {};

    switch (action) {
        case 'skipWaiting':
            self.skipWaiting();
            break;

        case 'clearCache':
            event.waitUntil(
                caches.keys().then((names) => {
                    return Promise.all(names.map((name) => caches.delete(name)));
                }).then(() => {
                    event.ports[0].postMessage({ success: true });
                })
            );
            break;

        case 'getCacheSize':
            event.waitUntil(
                getCacheSize().then((size) => {
                    event.ports[0].postMessage({ size });
                })
            );
            break;

        default:
            console.log('[SW] Unknown message:', action);
    }
});

/**
 * Spočítá velikost cache
 */
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.clone().blob();
                totalSize += blob.size;
            }
        }
    }

    return totalSize;
}

// Background sync pro offline akce
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

async function syncFavorites() {
    // Implementace sync logiky pro favorty
    console.log('[SW] Syncing favorites...');
}

// Push notifications (pro budoucí použití)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nová aktualizace v API Katalogu',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'API Katalog', options)
    );
});

// Click na notifikaci
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || './';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((windowClients) => {
            // Hledat existující okno
            for (const client of windowClients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otevřít nové okno
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

console.log('[SW] Service Worker loaded');
