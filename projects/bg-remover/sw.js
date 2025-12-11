/**
 * BG Remover - Service Worker
 * Enables offline functionality and caches essential resources
 */

const CACHE_NAME = 'bg-remover-v1';
const STATIC_CACHE = 'bg-remover-static-v1';
const DYNAMIC_CACHE = 'bg-remover-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json'
];

// External resources that should be cached when fetched
const EXTERNAL_CACHE_PATTERNS = [
    /cdn\.jsdelivr\.net/,
    /unpkg\.com/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('bg-remover-') &&
                                   name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Handle different resource types
    event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
    const url = new URL(request.url);

    // Check if this is an external resource that should be cached
    const isExternalCacheable = EXTERNAL_CACHE_PATTERNS.some(pattern => pattern.test(url.hostname));

    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        // Return cached version and update cache in background
        if (isExternalCacheable) {
            updateCache(request);
        }
        return cachedResponse;
    }

    // Network fetch
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses for external resources
        if (networkResponse.ok && isExternalCacheable) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                    cache.put(request, responseClone);
                });
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlineResponse = await caches.match('./index.html');
            if (offlineResponse) {
                return offlineResponse;
            }
        }

        // Return error response
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

async function updateCache(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - we already have cached version
    }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'getVersion') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});
