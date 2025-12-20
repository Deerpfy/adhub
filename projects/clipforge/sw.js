/**
 * ClipForge - Service Worker
 *
 * Provides offline-first functionality:
 * - Caches all static assets
 * - Serves from cache when offline
 * - Updates cache in background
 */

const CACHE_NAME = 'clipforge-v1.0.0';

// Assets to cache
const ASSETS = [
    '/projects/clipforge/',
    '/projects/clipforge/index.html',
    '/projects/clipforge/css/editor.css',
    '/projects/clipforge/js/db.js',
    '/projects/clipforge/js/timeline.js',
    '/projects/clipforge/js/preview.js',
    '/projects/clipforge/js/export.js',
    '/projects/clipforge/js/app.js',
    '/projects/clipforge/manifest.json',
    '/projects/clipforge/assets/icon-192.png',
    '/projects/clipforge/assets/icon-512.png'
];

// External assets (CDN)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

/**
 * Install event - cache assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets...');
                // Cache local assets
                return cache.addAll(ASSETS)
                    .then(() => {
                        // Try to cache external assets (non-critical)
                        return Promise.allSettled(
                            EXTERNAL_ASSETS.map(url =>
                                cache.add(url).catch(() => console.log('[SW] Could not cache:', url))
                            )
                        );
                    });
            })
            .then(() => {
                console.log('[SW] Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

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
                console.log('[SW] Activated successfully');
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

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // For navigation requests, try network first for fresh content
    if (event.request.mode === 'navigate') {
        event.respondWith(
            networkFirst(event.request)
        );
        return;
    }

    // For static assets, use cache-first strategy
    event.respondWith(
        cacheFirst(event.request)
    );
});

/**
 * Cache-first strategy
 * Try cache, fallback to network, update cache
 */
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        // Return cached response
        // Optionally update cache in background
        updateCache(request, cache);
        return cached;
    }

    // Not in cache, try network
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Network failed, return offline page or error
        console.error('[SW] Fetch failed:', error);
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Network-first strategy
 * Try network, fallback to cache
 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Network failed, try cache
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }

        // Nothing in cache, return offline page
        return new Response(getOfflineHTML(), {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

/**
 * Update cache in background
 */
async function updateCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response);
        }
    } catch (error) {
        // Silently fail - we're just updating cache
    }
}

/**
 * Get offline HTML page
 */
function getOfflineHTML() {
    return `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClipForge - Offline</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0f;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .offline-container {
            text-align: center;
            padding: 2rem;
        }
        .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        p {
            color: #9ca3af;
            margin-bottom: 1.5rem;
        }
        button {
            background: #8b5cf6;
            color: #fff;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background: #7c3aed;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📴</div>
        <h1>Jste offline</h1>
        <p>ClipForge potřebuje počáteční připojení k internetu pro načtení.</p>
        <button onclick="location.reload()">Zkusit znovu</button>
    </div>
</body>
</html>
    `;
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }

    if (event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

/**
 * Handle background sync (for future use)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-projects') {
        event.waitUntil(syncProjects());
    }
});

/**
 * Sync projects (placeholder for future cloud sync)
 */
async function syncProjects() {
    console.log('[SW] Syncing projects...');
    // Future: sync with cloud storage
}

console.log('[SW] Service Worker loaded');
