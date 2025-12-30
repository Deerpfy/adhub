/**
 * IP Lookup - Service Worker
 * Implements cache-first strategy for offline support
 * Version: 1.0.0
 */

const CACHE_NAME = 'ip-lookup-v1.0.0';

// Static assets to cache on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './icons/icon.svg'
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Install complete');
                // Activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        // Clean up old caches
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
    );
});

// ============================================
// FETCH EVENT
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests (ipify) - network only, don't cache
    if (url.hostname.includes('ipify.org')) {
        event.respondWith(
            fetch(request)
                .catch((error) => {
                    console.log('[SW] API request failed:', error);
                    // Return a proper error response
                    return new Response(
                        JSON.stringify({ error: 'offline' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Handle static assets - cache first, then network
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached response
                        // Also fetch from network to update cache (stale-while-revalidate)
                        fetch(request)
                            .then((networkResponse) => {
                                if (networkResponse && networkResponse.status === 200) {
                                    caches.open(CACHE_NAME)
                                        .then((cache) => cache.put(request, networkResponse));
                                }
                            })
                            .catch(() => {
                                // Network failed, but we have cache, so it's fine
                            });

                        return cachedResponse;
                    }

                    // No cache, fetch from network
                    return fetch(request)
                        .then((networkResponse) => {
                            // Cache successful responses
                            if (networkResponse && networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => cache.put(request, responseClone));
                            }
                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error('[SW] Fetch failed:', error);

                            // For navigation requests, return the cached index.html
                            if (request.mode === 'navigate') {
                                return caches.match('./index.html');
                            }

                            throw error;
                        });
                })
        );
        return;
    }

    // For external resources (CDN, etc.) - network first, cache fallback
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // Cache external resources too
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});

// ============================================
// MESSAGE HANDLER
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// ============================================
// BACKGROUND SYNC (for future enhancement)
// ============================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-ip') {
        console.log('[SW] Background sync triggered');
        // Could implement background IP check here
    }
});

console.log('[SW] Service Worker loaded');
