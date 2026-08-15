// =====================================================
// Service Worker (SPA Optimized)
// Version: v16
// =====================================================

const CACHE_VERSION = "v16";

const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

// Keep list robust. If any single asset fails to fetch, 
// install will fail. Use relative or absolute core entry points.
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json"
];

const MAX_DYNAMIC_ITEMS = 100;
const MAX_IMAGE_ITEMS = 200;

// =====================================================
// INSTALL
// =====================================================
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// =====================================================
// ACTIVATE
// =====================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ("navigationPreload" in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (e) {
          console.warn("[SW] Navigation preload failed to enable", e);
        }
      }

      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            console.log("[SW] Removing old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      await self.clients.claim();
      console.log("[SW] Activated version:", CACHE_VERSION);
    })()
  );
});

// =====================================================
// FETCH ROUTING
// =====================================================
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ignore cross-origin requests
  if (url.origin !== self.location.origin) return;

  // 1. HTML Navigation Requests (SPA Shell strategy)
  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(event, req));
    return;
  }

  // 2. API Requests (Network First with graceful JSON fallback)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstAPI(req));
    return;
  }

  // 3. Images (Stale While Revalidate)
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE, MAX_IMAGE_ITEMS));
    return;
  }

  // 4. Static Assets & Scripts/Styles/Fonts (Cache First with network fallback)
  event.respondWith(cacheFirst(req));
});

// =====================================================
// HANDLERS
// =====================================================

// SPA Navigation Handler: Try network/preload -> fallback to cached index.html -> fallback to offline.html
async function handleNavigation(event, req) {
  try {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      return preloadResponse;
    }

    const networkResponse = await fetch(req);
    if (networkResponse && networkResponse.status === 200) {
      // Optionally cache dynamic navigation page if needed, or let index.html handle it
      return networkResponse;
    }
    throw new Error("Network response not 200");
  } catch (err) {
    // Check if index.html is cached for SPA routing support
    const cache = await caches.open(STATIC_CACHE);
    const cachedIndex = await cache.match("/index.html");
    if (cachedIndex) {
      return cachedIndex;
    }
    // Absolute fallback if index isn't found
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

// Network First for API routes
async function networkFirstAPI(req) {
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(req, fresh.clone());
      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
    }
    return fresh;
  } catch (err) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    return new Response(
      JSON.stringify({
        error: "offline",
        success: false,
        message: "You are currently offline. Action cannot be completed."
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// Cache First for static scripts, styles, fonts
async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    // Background revalidate optional, returning cache immediately for speed
    return cached;
  }

  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    // If it's a script/style asset missing from cache and offline, fail gracefully
    return Response.error();
  }
}

// Stale While Revalidate for images
async function staleWhileRevalidate(req, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const networkFetch = fetch(req)
    .then(async (response) => {
      if (response && response.status === 200) {
        await cache.put(req, response.clone());
        limitCacheSize(cacheName, maxItems);
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

// =====================================================
// UTILS
// =====================================================
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  await cache.delete(keys[0]);
  limitCacheSize(cacheName, maxItems);
}

// =====================================================
// PUSH NOTIFICATIONS & MESSAGING
// =====================================================
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Notification",
      message: event.data.text(),
      url: "/",
    };
  }

  const { title = "Notification", message = "", url = "/" } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: "/assets/icon-192.png",
      badge: "/assets/icon-128.png",
      data: { url },
      actions: [{ action: "open", title: "Open" }],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.navigate(targetUrl);
          await client.focus();
          return;
        }
      }
      await clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});