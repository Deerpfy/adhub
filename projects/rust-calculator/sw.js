/**
 * Rust Calculator - Service Worker
 * Provides offline-first caching for the PWA
 */

const CACHE_NAME = 'rust-calculator-v1.0.2';
const CACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './data.js',
    './manifest.json',
    // App icons
    './icons/icon.svg',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png',
    // Game icons (local SVGs for offline support)
    './icons/game/ammo.rifle.explosive.svg',
    './icons/game/ammo.rocket.basic.svg',
    './icons/game/ammo.rocket.fire.svg',
    './icons/game/ammo.rocket.hv.svg',
    './icons/game/autoturret.svg',
    './icons/game/axe.salvaged.svg',
    './icons/game/bone.club.svg',
    './icons/game/box.wooden.large.svg',
    './icons/game/charcoal.svg',
    './icons/game/cloth.svg',
    './icons/game/cupboard.tool.svg',
    './icons/game/door.double.hinged.metal.svg',
    './icons/game/door.hinged.metal.svg',
    './icons/game/door.hinged.toptier.svg',
    './icons/game/door.hinged.wood.svg',
    './icons/game/explosive.satchel.svg',
    './icons/game/explosive.timed.svg',
    './icons/game/explosives.svg',
    './icons/game/fat.animal.svg',
    './icons/game/gears.svg',
    './icons/game/grenade.beancan.svg',
    './icons/game/grenade.f1.svg',
    './icons/game/gunpowder.svg',
    './icons/game/jackhammer.svg',
    './icons/game/lowgradefuel.svg',
    './icons/game/metal.fragments.svg',
    './icons/game/metal.refined.svg',
    './icons/game/metalpipe.svg',
    './icons/game/rock.svg',
    './icons/game/rocket.launcher.svg',
    './icons/game/rope.svg',
    './icons/game/samsite.svg',
    './icons/game/scrap.svg',
    './icons/game/stash.small.svg',
    './icons/game/stones.svg',
    './icons/game/sulfur.svg',
    './icons/game/techparts.svg',
    './icons/game/vending.machine.svg',
    './icons/game/wall.frame.cell.svg',
    './icons/game/wall.window.bars.metal.svg',
    './icons/game/wood.svg',
    './icons/game/workbench1.svg',
    './icons/game/workbench2.svg',
    './icons/game/workbench3.svg'
];

// Install event - cache all assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell...');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Install failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
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
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Return cached response
                    console.log('[SW] Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // Not in cache - fetch from network
                console.log('[SW] Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache the new response
                        if (networkResponse.ok) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(err => {
                        console.error('[SW] Fetch failed:', err);

                        // Return fallback for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('./index.html');
                        }

                        // Return error for other requests
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Message event - handle cache updates
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});

// Background sync for future use
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
});

// Push notifications for future use
self.addEventListener('push', event => {
    console.log('[SW] Push received:', event);
});
