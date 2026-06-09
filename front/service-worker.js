// =====================================================
// Service Worker
// Version: v15
// =====================================================

const CACHE_VERSION = "v15";

const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/js/app.js",
  "/js/assets/styles.css",
  "/assets/icon-128.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

// Cache limits
const MAX_DYNAMIC_ITEMS = 100;
const MAX_IMAGE_ITEMS = 200;

// =====================================================
// INSTALL
// =====================================================

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
    })()
  );
});

// =====================================================
// ACTIVATE
// =====================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Enable Navigation Preload
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
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

      console.log("[SW] Activated:", CACHE_VERSION);
    })()
  );
});

// =====================================================
// FETCH
// =====================================================

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ignore cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML Navigation
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(event, req));
    return;
  }

  // API Requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event, req, true));
    return;
  }

  // Images
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Fonts
  if (req.destination === "font") {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Static assets
  if (
    req.destination === "script" ||
    req.destination === "style" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
});

// =====================================================
// NETWORK FIRST
// =====================================================

async function networkFirst(event, req, isAPI = false) {
  try {
    const preloadResponse = await event.preloadResponse;

    if (preloadResponse) {
      return preloadResponse;
    }

    const fresh = await fetch(req);

    if (fresh.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(req, fresh.clone());

      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
    }

    return fresh;
  } catch {
    const cache = await caches.open(DYNAMIC_CACHE);

    const cached = await cache.match(req);

    if (cached) {
      return cached;
    }

    if (isAPI) {
      return new Response(
        JSON.stringify({
          error: "offline",
          success: false,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 503,
        }
      );
    }

    return (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

// =====================================================
// CACHE FIRST
// =====================================================

async function cacheFirst(req, cacheName = STATIC_CACHE) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(req);

  if (cached) {
    return cached;
  }

  try {
    const fresh = await fetch(req);

    if (fresh.ok) {
      await cache.put(req, fresh.clone());
    }

    return fresh;
  } catch {
    return cached || Response.error();
  }
}

// =====================================================
// STALE WHILE REVALIDATE
// =====================================================

async function staleWhileRevalidate(req) {
  const cache = await caches.open(IMAGE_CACHE);

  const cached = await cache.match(req);

  const networkFetch = fetch(req)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(req, response.clone());

        limitCacheSize(IMAGE_CACHE, MAX_IMAGE_ITEMS);
      }

      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

// =====================================================
// CACHE SIZE LIMITER
// =====================================================

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);

  const keys = await cache.keys();

  if (keys.length <= maxItems) {
    return;
  }

  await cache.delete(keys[0]);

  return limitCacheSize(cacheName, maxItems);
}

// =====================================================
// PUSH NOTIFICATIONS
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

  const {
    title = "Notification",
    message = "",
    url = "/",
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message,
      icon: "/assets/icon-192.png",
      badge: "/assets/icon-128.png",
      data: { url },
      actions: [
        {
          action: "open",
          title: "Open",
        },
      ],
      requireInteraction: false,
    })
  );
});

// =====================================================
// NOTIFICATION CLICK
// =====================================================

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

// =====================================================
// MESSAGE EVENTS
// Allows app to force update SW
// =====================================================

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});