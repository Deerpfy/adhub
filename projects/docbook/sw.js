/**
 * DocBook - Service Worker
 * Enables offline functionality by caching all assets
 */

const CACHE_NAME = 'docbook-v1.0.0';
const CACHE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './db.js',
    './search.js',
    './editor.js',
    './export.js',
    './app.js',
    './manifest.json',
    './icons/icon-72.svg',
    './icons/icon-96.svg',
    './icons/icon-128.svg',
    './icons/icon-144.svg',
    './icons/icon-152.svg',
    './icons/icon-192.svg',
    './icons/icon-384.svg',
    './icons/icon-512.svg'
];

// External libraries to cache
const CACHE_LIBS = [
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    'https://unpkg.com/marked@11.1.1/marked.min.js',
    'https://unpkg.com/dompurify@3.0.6/dist/purify.min.js',
    'https://unpkg.com/flexsearch@0.7.31/dist/flexsearch.bundle.min.js'
];

/**
 * Install event - cache all static assets
 */
self.addEventListener('install', (event) => {
    console.log('[DocBook SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('[DocBook SW] Caching assets...');

                // Cache local assets
                await cache.addAll(CACHE_ASSETS);

                // Cache external libraries
                for (const url of CACHE_LIBS) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            await cache.put(url, response);
                        }
                    } catch (error) {
                        console.warn('[DocBook SW] Failed to cache:', url, error);
                    }
                }

                console.log('[DocBook SW] Assets cached');
            })
            .then(() => self.skipWaiting())
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[DocBook SW] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log('[DocBook SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[DocBook SW] Activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached response if available
                if (cachedResponse) {
                    // Fetch in background to update cache (stale-while-revalidate)
                    if (navigator.onLine) {
                        fetchAndCache(event.request);
                    }
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-success responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            // But do cache CDN responses
                            if (response && response.ok && isCDNRequest(url)) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(event.request, responseClone));
                            }
                            return response;
                        }

                        // Clone and cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch((error) => {
                        console.warn('[DocBook SW] Fetch failed:', event.request.url, error);

                        // Return offline fallback for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }

                        throw error;
                    });
            })
    );
});

/**
 * Fetch and update cache in background
 */
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
        }
    } catch (error) {
        // Ignore fetch errors for background updates
    }
}

/**
 * Check if request is from a CDN
 */
function isCDNRequest(url) {
    const cdnHosts = [
        'unpkg.com',
        'cdn.jsdelivr.net',
        'cdnjs.cloudflare.com'
    ];
    return cdnHosts.some(host => url.hostname.includes(host));
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[DocBook SW] Cache cleared');
            event.ports[0].postMessage({ success: true });
        });
    }
});

console.log('[DocBook SW] Loaded');
