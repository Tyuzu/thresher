// =====================================================
// Farmium Service Worker
// SPA + PWA + Offline Support
// Version: v18
// =====================================================
const CACHE_VERSION = "v18";
const STATIC_CACHE = `farmium-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `farmium-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `farmium-images-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const OFFWORK_URL = "/offWork.html";
const APP_SHELL = "/index.html";
const MAX_DYNAMIC_ITEMS = 100;
const MAX_IMAGE_ITEMS = 200;
// =====================================================
// STATIC ASSETS
// =====================================================
//
// Keep this list intentionally small.
// Large application assets are cached on demand.
//
// offline.html and offWork.html are included because
// they must work when the network is unavailable.
//
const STATIC_ASSETS = ["/",
    APP_SHELL,
    OFFLINE_URL,
    OFFWORK_URL, "/manifest.json",
];
// =====================================================
// INSTALL
// =====================================================
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            console.log("[SW] Installing:", CACHE_VERSION);
            const cache = await caches.open(STATIC_CACHE);
            /*
             * cache.addAll() fails the entire installation if even
             * one asset cannot be fetched.
             *
             * For a PWA, the offline shell is important enough that
             * we still want to know exactly what failed.
             */
            for (const asset of STATIC_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (error) {
                    console.error(`[SW] Failed to precache ${asset}:`, error);
                    /*
                     * These files are required for offline navigation.
                     * If one cannot be cached, installation should fail
                     * rather than silently producing a broken offline mode.
                     */
                    if (asset === APP_SHELL || asset === OFFLINE_URL || asset === OFFWORK_URL) {
                        throw error;
                    }
                }
            }
            /*
             * Activate the new worker immediately.
             *
             * This is useful for a controlled PWA update flow.
             */
            await self.skipWaiting();
            console.log("[SW] Installed:", CACHE_VERSION);
        })());
});
// =====================================================
// ACTIVATE
// =====================================================
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            console.log("[SW] Activating:", CACHE_VERSION);
            /*
             * Navigation preload lets navigation requests start
             * fetching from the network while the service worker
             * is starting.
             */
            if ("navigationPreload" in self.registration) {
                try {
                    await self.registration.navigationPreload.enable();
                } catch (error) {
                    console.warn("[SW] Navigation preload unavailable:", error);
                }
            }
            /*
             * Remove every cache belonging to an older Farmium
             * service-worker version.
             */
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((cacheName) => {
                const isCurrentCache = cacheName === STATIC_CACHE || cacheName === DYNAMIC_CACHE || cacheName === IMAGE_CACHE;
                if (!isCurrentCache) {
                    console.log("[SW] Removing old cache:", cacheName);
                    return caches.delete(cacheName);
                }
                return Promise.resolve(false);
            }));
            /*
             * Take control of existing pages immediately.
             */
            await self.clients.claim();
            console.log("[SW] Activated:", CACHE_VERSION);
            /*
             * Tell open Farmium tabs that the new worker is active.
             */
            const windowClients = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });
            for (const client of windowClients) {
                client.postMessage({
                    type: "SW_ACTIVATED",
                    version: CACHE_VERSION,
                });
            }
        })());
});
// =====================================================
// FETCH ROUTING
// =====================================================
self.addEventListener("fetch", (event) => {
    const request = event.request;
    /*
     * Only GET requests are cacheable through these strategies.
     *
     * POST, PUT, PATCH and DELETE requests are deliberately
     * allowed to go directly to the network.
     */
    if (request.method !== "GET") {
        return;
    }
    const url = new URL(request.url);
    /*
     * Only handle same-origin requests.
     *
     * Requests to Render, CDNs, analytics providers, etc.
     * remain outside this service worker unless explicitly
     * handled by the browser/network.
     */
    if (url.origin !== self.location.origin) {
        return;
    }
    /*
     * 1. HTML NAVIGATION
     */
    if (request.mode === "navigate") {
        event.respondWith(handleNavigation(event, request));
        return;
    }
    /*
     * 2. API
     */
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirstAPI(request));
        return;
    }
    /*
     * 3. IMAGES
     */
    if (request.destination === "image") {
        event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ITEMS));
        return;
    }
    /*
     * 4. JS / CSS / fonts / manifest / other same-origin
     *    static resources.
     */
    event.respondWith(cacheFirst(request));
});
// =====================================================
// NAVIGATION
// =====================================================
async function handleNavigation(event, request) {
    const url = new URL(request.url);
    try {
        /*
         * Prefer navigation preload when available.
         */
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
            if (preloadResponse.ok) {
                return preloadResponse;
            }
        }
        /*
         * Otherwise try the live network.
         */
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            /*
             * Navigation responses are deliberately not added
             * to the static cache here.
             *
             * The SPA shell is controlled by the deployment and
             * gets updated through the service-worker version.
             */
            return networkResponse;
        }
        throw new Error(`Navigation failed with status ${networkResponse.status}`);
    } catch (error) {
        console.warn("[SW] Navigation offline:", url.pathname);
        const cache = await caches.open(STATIC_CACHE);
        /*
         * Exact offline-capable documents first.
         *
         * /offWork.html
         * /offline.html
         */
        const exactMatch = await cache.match(url.pathname);
        if (exactMatch) {
            return exactMatch;
        }
        /*
         * SPA routes such as:
         *
         * /dashboard
         * /profile
         * /settings
         *
         * get the application shell.
         */
        const cachedIndex = await cache.match(APP_SHELL);
        if (cachedIndex) {
            return cachedIndex;
        }
        /*
         * Last-resort offline page.
         */
        const offlinePage = await cache.match(OFFLINE_URL);
        if (offlinePage) {
            return offlinePage;
        }
        /*
         * There should almost never be a situation where
         * this happens because offline.html is required
         * during installation.
         */
        return new Response(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport"
              content="width=device-width,initial-scale=1">
            <title>Farmium Offline</title>
          </head>
          <body>
            <h1>Farmium is offline</h1>
            <p>Please reconnect to the internet and try again.</p>
          </body>
        </html>
      `, {
            status: 503,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });
    }
}
// =====================================================
// API
// =====================================================
//
// Strategy:
//   Network → Cache → 503 JSON
//
// Cached GET API responses are useful for read-only data.
// Mutations should not be faked as successful offline.
//
async function networkFirstAPI(request) {
    try {
        const response = await fetch(request);
        /*
         * Only cache successful API responses.
         */
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, response.clone());
            await limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
        }
        return response;
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        return new Response(JSON.stringify({
            error: "offline",
            success: false,
            message: "You are currently offline. This action cannot be completed.",
        }), {
            status: 503,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        });
    }
}
// =====================================================
// CACHE FIRST
// =====================================================
//
// Used for JS, CSS, fonts, manifest and other same-origin
// static resources.
//
// Existing cached assets are returned immediately.
// Missing assets are fetched and then cached.
//
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    try {
        const response = await fetch(request);
        if (shouldCacheResponse(response)) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        /*
         * A generic asset has no useful offline fallback.
         */
        return new Response("", {
            status: 503,
            statusText: "Offline",
        });
    }
}
// =====================================================
// STALE WHILE REVALIDATE
// =====================================================
//
// Images are shown from cache immediately when available.
// The network updates the cache in the background.
//
async function staleWhileRevalidate(request, cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkFetch = fetch(request).then(async (response) => {
        if (shouldCacheResponse(response)) {
            await cache.put(request, response.clone());
            await limitCacheSize(cacheName, maxItems);
        }
        return response;
    }).catch(() => {
        return cached || null;
    });
    /*
     * Cached image wins immediately.
     * Network updates happen in the background.
     */
    if (cached) {
        return cached;
    }
    const networkResponse = await networkFetch;
    if (networkResponse) {
        return networkResponse;
    }
    return new Response("", {
        status: 503,
        statusText: "Offline",
    });
}
// =====================================================
// RESPONSE VALIDATION
// =====================================================
function shouldCacheResponse(response) {
    if (!response) {
        return false;
    }
    /*
     * 200-299 responses are normally cacheable.
     */
    if (response.ok) {
        return true;
    }
    /*
     * Opaque responses have status 0.
     *
     * Cross-origin requests are currently ignored above,
     * but this keeps the helper safe if the routing changes.
     */
    if (response.type === "opaque") {
        return true;
    }
    return false;
}
// =====================================================
// CACHE LIMITING
// =====================================================
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) {
        return;
    }
    /*
     * Delete oldest entries first.
     *
     * Cache.keys() returns requests in insertion order
     * for the Cache API implementation.
     */
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
    }
}
// =====================================================
// PUSH NOTIFICATIONS
// =====================================================
self.addEventListener("push", (event) => {
    if (!event.data) {
        return;
    }
    event.waitUntil(
        (async () => {
            let data = {};
            try {
                data = event.data.json();
            } catch {
                data = {
                    title: "Farmium",
                    message: event.data.text(),
                    url: "/",
                };
            }
            const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Farmium";
            const message = typeof data.message === "string" ? data.message : "";
            const targetUrl = getSafeNotificationUrl(data.url);
            await self.registration.showNotification(title, {
                body: message,
                icon: "/assets/icon-192.png",
                badge: "/assets/icon-128.png",
                data: {
                    url: targetUrl,
                },
                actions: [{
                    action: "open",
                    title: "Open",
                }, ],
            });
        })());
});
// =====================================================
// NOTIFICATION CLICK
// =====================================================
self.addEventListener("notificationclick",
    (event) => {
        event.notification.close();
        const targetUrl = getSafeNotificationUrl(event.notification.data?.url);
        event.waitUntil(
            (async () => {
                const windowClients = await self.clients.matchAll({
                    type: "window",
                    includeUncontrolled: true,
                });
                /*
                 * Prefer an existing Farmium tab/window.
                 */
                for (const client of windowClients) {
                    try {
                        const clientUrl = new URL(client.url);
                        if (clientUrl.origin === self.location.origin) {
                            await client.navigate(targetUrl);
                            await client.focus();
                            return;
                        }
                    } catch {
                        // Continue to the next client.
                    }
                }
                /*
                 * No existing Farmium window.
                 */
                await self.clients.openWindow(targetUrl);
            })());
    });
// =====================================================
// SAFE NOTIFICATION URL
// =====================================================
function getSafeNotificationUrl(value) {
    if (typeof value !== "string") {
        return "/";
    }
    try {
        const url = new URL(value, self.location.origin);
        /*
         * Notifications should only navigate within
         * the Farmium origin.
         */
        if (url.origin !== self.location.origin) {
            return "/";
        }
        /*
         * Only normal web navigation protocols.
         */
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return "/";
        }
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return "/";
    }
}
// =====================================================
// MESSAGES FROM APP
// =====================================================
self.addEventListener("message", (event) => {
    const type = event.data?.type;
    /*
     * Force this worker to activate immediately.
     */
    if (type === "SKIP_WAITING") {
        event.waitUntil(self.skipWaiting());
        return;
    }
    /*
     * Useful during development or an authenticated
     * maintenance operation.
     */
    if (type === "CLEAR_CACHES") {
        event.waitUntil(clearAllFarmiumCaches());
        return;
    }
    /*
     * Return the currently active service-worker version.
     */
    if (type === "GET_SW_VERSION") {
        event.source?.postMessage({
            type: "SW_VERSION",
            version: CACHE_VERSION,
        });
    }
});
// =====================================================
// CACHE MANAGEMENT
// =====================================================
async function clearAllFarmiumCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => {
        if (cacheName.startsWith("farmium-")) {
            return caches.delete(cacheName);
        }
        return Promise.resolve(false);
    }));
    console.log("[SW] Farmium caches cleared.");
}