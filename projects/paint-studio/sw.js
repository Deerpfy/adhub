/**
 * Paint Studio - Service Worker for offline functionality
 */

const CACHE_NAME = 'paint-studio-v1.0.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './app/main.js',
    './app/core/PaintApp.js',
    './app/core/CanvasManager.js',
    './app/core/LayerManager.js',
    './app/core/HistoryManager.js',
    './app/tools/BrushEngine.js',
    './app/tools/ToolManager.js',
    './app/tools/QuickShape.js',
    './app/tools/StreamLine.js',
    './app/tools/tools/BrushTool.js',
    './app/tools/tools/PencilTool.js',
    './app/tools/tools/EraserTool.js',
    './app/tools/tools/FillTool.js',
    './app/tools/tools/EyedropperTool.js',
    './app/tools/tools/LineTool.js',
    './app/tools/tools/RectangleTool.js',
    './app/tools/tools/EllipseTool.js',
    './app/tools/tools/MoveTool.js',
    './app/ui/ColorPicker.js',
    './app/ui/UIController.js',
    './app/utils/StorageManager.js'
];

// Install event - cache static assets
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
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
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
                        .filter((name) => name !== CACHE_NAME)
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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response
                    return cachedResponse;
                }

                // Fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Don't cache if not successful
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        // Clone response for caching
                        const responseClone = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseClone);
                            });

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);

                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }

                        throw error;
                    });
            })
    );
});

// Handle messages from client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Background sync for saving projects (future feature)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-project') {
        console.log('[SW] Syncing project...');
        // Could implement cloud sync here
    }
});

// Push notifications (future feature)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        console.log('[SW] Push received:', data);

        event.waitUntil(
            self.registration.showNotification(data.title || 'Paint Studio', {
                body: data.body,
                icon: './icons/icon-192.png',
                badge: './icons/icon-72.png'
            })
        );
    }
});
