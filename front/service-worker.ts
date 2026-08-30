/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = "v18";
const STATIC_CACHE = `scav-static-${CACHE_VERSION}`;
const STAGE_2_CACHE = `scav-stage2-${CACHE_VERSION}`;

// Stage-1: Core shell required for instant offline booting
const STAGE_1_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/offWork.html",
  "/manifest.json",
];

// Stage-2: Secondary assets fetched in the background later
const STAGE_2_ASSETS = [
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/fonts/main-font.woff2",
  // Add non-critical static paths or secondary routes here
];

// Stage-1 Boot
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(STAGE_1_ASSETS.map((asset) => cache.add(asset)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

// Message Receiver for Stage-2 Trigger
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "WARMUP_STAGE_2") {
    event.waitUntil(executeStage2Boot());
  }
});

// Stage-2 Execution: Background pre-fetching
async function executeStage2Boot(): Promise<void> {
  console.log("[SW Stage-2] Starting background warm-up...");
  const cache = await caches.open(STAGE_2_CACHE);

  // Download files sequentially with small delays to preserve network bandwidth
  for (const asset of STAGE_2_ASSETS) {
    try {
      const response = await fetch(asset, { priority: "low" } as RequestInit);
      if (response.ok) {
        await cache.put(asset, response);
      }
    } catch {
      console.warn(`[SW Stage-2] Pre-fetch skipped for ${asset}`);
    }
  }
  console.log("[SW Stage-2] Warm-up complete.");
}