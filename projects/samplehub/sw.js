/**
 * SampleHub - Service Worker
 * Enables offline-first functionality
 * Version: 1.0
 */

const CACHE_NAME = 'samplehub-v1';
const STATIC_CACHE = 'samplehub-static-v1';
const DYNAMIC_CACHE = 'samplehub-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './db.js',
    './audio.js',
    './manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
    // Cache first, fallback to network
    CACHE_FIRST: 'cache-first',
    // Network first, fallback to cache
    NETWORK_FIRST: 'network-first',
    // Stale while revalidate
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    // Network only
    NETWORK_ONLY: 'network-only',
    // Cache only
    CACHE_ONLY: 'cache-only'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

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

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete old version caches
                            return name.startsWith('samplehub-') &&
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
                console.log('[SW] Service Worker activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - handle network requests
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Determine cache strategy based on request type
    const strategy = getCacheStrategy(request);

    switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
            event.respondWith(cacheFirst(request));
            break;

        case CACHE_STRATEGIES.NETWORK_FIRST:
            event.respondWith(networkFirst(request));
            break;

        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            event.respondWith(staleWhileRevalidate(request));
            break;

        case CACHE_STRATEGIES.NETWORK_ONLY:
            event.respondWith(networkOnly(request));
            break;

        case CACHE_STRATEGIES.CACHE_ONLY:
            event.respondWith(cacheOnly(request));
            break;

        default:
            event.respondWith(cacheFirst(request));
    }
});

/**
 * Determine cache strategy for request
 * @param {Request} request
 * @returns {string}
 */
function getCacheStrategy(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static assets - cache first
    if (
        pathname.endsWith('.html') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.json') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.ico')
    ) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }

    // Audio files - cache first (they're stored locally)
    if (
        pathname.endsWith('.wav') ||
        pathname.endsWith('.mp3') ||
        pathname.endsWith('.flac') ||
        pathname.endsWith('.aiff') ||
        pathname.endsWith('.ogg')
    ) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }

    // API requests - network first
    if (pathname.startsWith('/api/')) {
        return CACHE_STRATEGIES.NETWORK_FIRST;
    }

    // Default - stale while revalidate
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

/**
 * Cache First strategy
 * Try cache, fallback to network
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        return createOfflineResponse();
    }
}

/**
 * Network First strategy
 * Try network, fallback to cache
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        console.error('[SW] Network first failed:', error);
        return createOfflineResponse();
    }
}

/**
 * Stale While Revalidate strategy
 * Return cached immediately, update cache in background
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);

    // Start network request in background
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                caches.open(DYNAMIC_CACHE)
                    .then((cache) => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
        })
        .catch(() => null);

    // Return cached response if available, otherwise wait for network
    return cachedResponse || fetchPromise || createOfflineResponse();
}

/**
 * Network Only strategy
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkOnly(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.error('[SW] Network only failed:', error);
        return createOfflineResponse();
    }
}

/**
 * Cache Only strategy
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheOnly(request) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse();
}

/**
 * Create offline fallback response
 * @returns {Response}
 */
function createOfflineResponse() {
    return new Response(
        JSON.stringify({
            error: 'offline',
            message: 'You are currently offline'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

/**
 * Message event - handle messages from main thread
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            clearAllCaches()
                .then(() => {
                    event.ports[0]?.postMessage({ success: true });
                })
                .catch((error) => {
                    event.ports[0]?.postMessage({ success: false, error: error.message });
                });
            break;

        case 'CACHE_AUDIO':
            if (data && data.url && data.blob) {
                cacheAudioFile(data.url, data.blob)
                    .then(() => {
                        event.ports[0]?.postMessage({ success: true });
                    })
                    .catch((error) => {
                        event.ports[0]?.postMessage({ success: false, error: error.message });
                    });
            }
            break;

        default:
            console.log('[SW] Unknown message type:', type);
    }
});

/**
 * Clear all caches
 * @returns {Promise}
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map((name) => caches.delete(name))
    );
}

/**
 * Cache an audio file
 * @param {string} url
 * @param {Blob} blob
 * @returns {Promise}
 */
async function cacheAudioFile(url, blob) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(blob, {
        headers: {
            'Content-Type': blob.type,
            'Content-Length': blob.size
        }
    });
    return cache.put(url, response);
}

/**
 * Background sync (if supported)
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-library') {
        event.waitUntil(syncLibrary());
    }
});

/**
 * Sync library data (placeholder)
 * @returns {Promise}
 */
async function syncLibrary() {
    // This would sync with a server if we had one
    console.log('[SW] Library sync completed (offline-only mode)');
    return Promise.resolve();
}

console.log('[SW] Service Worker loaded');
