/**
 * AI Visibility Tracker - Service Worker
 *
 * Provides offline-first caching strategy for PWA functionality
 */

const CACHE_NAME = 'ai-visibility-tracker-v1.0.0';

// Files to cache for offline use
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './manifest.json'
];

// External resources to cache (Chart.js CDN)
const EXTERNAL_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                // Cache static assets
                return cache.addAll(STATIC_ASSETS)
                    .then(() => {
                        // Try to cache external assets (may fail if offline)
                        return Promise.allSettled(
                            EXTERNAL_ASSETS.map(url =>
                                cache.add(url).catch(err => {
                                    console.log('[SW] Failed to cache external asset:', url);
                                })
                            )
                        );
                    });
            })
            .then(() => {
                console.log('[SW] Installation complete');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
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
                console.log('[SW] Activation complete');
                // Take control of all clients immediately
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

    // For same-origin requests - cache first, network fallback
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached version
                        return cachedResponse;
                    }

                    // Not in cache, fetch from network
                    return fetch(request)
                        .then((networkResponse) => {
                            // Don't cache non-ok responses
                            if (!networkResponse || networkResponse.status !== 200) {
                                return networkResponse;
                            }

                            // Clone and cache the response
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });

                            return networkResponse;
                        })
                        .catch((error) => {
                            console.log('[SW] Fetch failed for:', request.url);

                            // Return offline page for navigation requests
                            if (request.mode === 'navigate') {
                                return caches.match('./index.html');
                            }

                            // Return error for other requests
                            return new Response('Offline', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                })
        );
        return;
    }

    // For external requests (CDN) - network first, cache fallback
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // Clone and cache successful responses
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseToCache);
                        });
                }
                return networkResponse;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return empty response for external assets
                        return new Response('', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME)
            .then(() => {
                event.ports[0].postMessage({ success: true });
            })
            .catch((error) => {
                event.ports[0].postMessage({ success: false, error: error.message });
            });
    }
});

// Background sync for future use
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-data') {
        // Could be used for syncing data when back online
        // Currently not needed for 100% offline app
    }
});

// Push notifications for future use
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    // Could be used for notifications about AI visibility changes
    // Currently not needed for 100% offline app
});

console.log('[SW] Service Worker loaded');
