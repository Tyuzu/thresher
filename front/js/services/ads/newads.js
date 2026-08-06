// src/utils/newads.js
import "../../../css/subpages/rolling1.css";
import "../../../css/subpages/sda.css";
import { createElement } from "../../components/createElement.js";
import { t } from "../../i18n/i18n.js";

let adCounter = 0;

// Centralized weak maps for memory-safe state and lifecycle tracking
const adConfigs = new WeakMap();
const adRefreshTimers = new WeakMap();

/**
 * Resolves current page context from options or window.location.
 */
function resolvePageContext(page) {
  if (page && page !== "home" && page !== "auto") {
    return page;
  }
  if (typeof window !== "undefined" && window.location) {
    const path = window.location.pathname.replace(/^\/|\/$/g, "");
    if (path) {
      // e.g. "/dashboard/settings" -> "dashboard"
      return path.split("/")[0];
    }
  }
  return "home";
}

/**
 * Default internal fetcher that connects directly to the Go backend (/api/v1/sda/sda).
 */
async function defaultAdNetworkFetcher(slotEl) {
  const page = slotEl.getAttribute("data-page") || "home";
  const position = slotEl.getAttribute("data-position") || "";

  const queryParams = new URLSearchParams({ page, position });
  const response = await fetch(`/api/v1/sda/sda?${queryParams.toString()}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Ad API error HTTP ${response.status}`);
  }

  const adData = await response.json();

  if (!adData || !adData.Link) {
    throw new Error("Invalid ad payload received");
  }

  // Clear fallback text and inject HTML
  slotEl.innerHTML = "";
  
  const anchor = createElement("a", {
    href: adData.Link,
    target: "_blank",
    rel: "noopener noreferrer",
    class: "ad-banner-link"
  }, [
    createElement("img", {
      src: adData.Image,
      alt: adData.Title || "Advertisement",
      class: "ad-banner-img"
    }),
    createElement("div", { class: "ad-banner-info" }, [
      createElement("strong", { class: "ad-title" }, [adData.Title || ""]),
      createElement("p", { class: "ad-desc" }, [adData.Description || ""])
    ])
  ]);

  slotEl.appendChild(anchor);

  // Trigger impression tracking
  if (adData.ID && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(`/api/v1/sda/track-impression?id=${encodeURIComponent(adData.ID)}`);
  }
}

// Singleton IntersectionObserver: Handles viewport-based lazy loading
const sharedAdObserver = (typeof window !== "undefined" && "IntersectionObserver" in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const slotEl = entry.target;
        const config = adConfigs.get(slotEl);

        if (!config) return;

        if (entry.isIntersecting) {
          if (slotEl.getAttribute("data-ad-state") === "waiting") {
            triggerAdInitialization(slotEl, config);
          }
          // Resume auto-refresh if enabled and ad was loaded
          if (config.refreshInterval && slotEl.getAttribute("data-ad-state") === "loaded") {
            startRefreshTimer(slotEl, config);
          }
        } else {
          // Pause refresh when ad leaves the viewport to save memory and CPU
          stopRefreshTimer(slotEl);
        }
      });
    }, { rootMargin: "200px" })
  : null;

/**
 * Handles ad network execution with fallback strategy chain.
 */
async function triggerAdInitialization(slotEl, config) {
  const { adNetworkInit, fallbackNetworks = [], debug } = config;

  slotEl.setAttribute("data-ad-state", "loading");

  // Pipeline of networks to attempt: Primary -> Fallbacks -> Default Go API
  const networksToTry = [];
  if (typeof adNetworkInit === "function") {
    networksToTry.push(adNetworkInit);
  } else {
    // If no provider is explicitly provided, use built-in backend fetcher
    networksToTry.push(defaultAdNetworkFetcher);
  }

  if (Array.isArray(fallbackNetworks)) {
    networksToTry.push(...fallbackNetworks.filter(fn => typeof fn === "function"));
  }

  let initialized = false;

  for (let i = 0; i < networksToTry.length; i++) {
    const netFn = networksToTry[i];
    try {
      if (debug) console.warn(`[Ad System] Trying ad provider level ${i + 1} for ${slotEl.id}`);
      await Promise.resolve(netFn(slotEl));
      
      slotEl.setAttribute("data-ad-state", "loaded");
      slotEl.setAttribute("data-ad-provider", `provider-${i + 1}`);
      initialized = true;

      // Start auto-refresh timer if feature is active
      if (config.refreshInterval) {
        startRefreshTimer(slotEl, config);
      }
      break; 
    } catch (err) {
      console.error(`[Ad System] Network provider ${i + 1} failed for ${slotEl.id}:`, err);
    }
  }

  if (!initialized) {
    slotEl.setAttribute("data-ad-state", "failed");
    stopRefreshTimer(slotEl);
  }
}

/**
 * Starts auto-refresh interval for a given slot.
 */
function startRefreshTimer(slotEl, config) {
  stopRefreshTimer(slotEl); // Clear existing timer if any

  // Ensure refresh interval is at least 10 seconds to avoid spamming network calls
  const interval = Math.max(config.refreshInterval, 10000);

  const timerId = setInterval(() => {
    // Only refresh if tab is active and visible
    if (document.hidden) return;

    if (config.debug) {
      console.warn(`[Ad System] Auto-refreshing slot: ${slotEl.id}`);
    }

    triggerAdInitialization(slotEl, config);
  }, interval);

  adRefreshTimers.set(slotEl, timerId);
}

/**
 * Clears auto-refresh timer for an ad slot.
 */
function stopRefreshTimer(slotEl) {
  if (adRefreshTimers.has(slotEl)) {
    clearInterval(adRefreshTimers.get(slotEl));
    adRefreshTimers.delete(slotEl);
  }
}

/**
 * Embed an advertisement slot with lazy-loading, CLS protections, fallbacks, and auto-refresh support.
 * 
 * @param {string} [page] - Page identifier (e.g., "home", "article"). Defaults to current route.
 * @param {string} [position=""] - Slot position (e.g., "top", "sidebar", "aside")
 * @param {object} [options={}] - Configuration options
 * @param {function} [options.adNetworkInit] - Primary ad loading function (Defaults to Go backend fetcher)
 * @param {function[]} [options.fallbackNetworks] - Array of secondary ad network initializers
 * @param {number} [options.refreshInterval=0] - Auto-refresh interval in ms (e.g., 30000 for 30s). 0 to disable.
 * @param {string|number} [options.width="auto"] - Minimum width for CLS protection
 * @param {string|number} [options.height="auto"] - Minimum height for CLS protection
 * @param {string} [options.classes=""] - Additional custom CSS classes
 * @param {string} [options.fallbackText] - Display text while ad is loading/failed
 * @param {boolean} [options.debug=false] - Enables debug console logging
 */
export function advertEmbed(page, position = "", options = {}) {
  adCounter++;

  const resolvedPage = resolvePageContext(page);

  const {
    classes = "",
    fallbackText = t("common.advertisement", {}, "Advertisement"),
    adNetworkInit = null,
    fallbackNetworks = [],
    refreshInterval = 0,
    width = "auto",
    height = "auto",
    debug = false
  } = options;

  const slotId = `ad-slot-${resolvedPage}-${position || "default"}-${adCounter}`;

  const styleMinW = typeof width === "number" ? `${width}px` : width;
  const styleMinH = typeof height === "number" ? `${height}px` : height;

  const slotEl = createElement("div", {
    id: slotId,
    class: `ad-slot ${classes}`.trim(),
    "data-page": resolvedPage,
    "data-position": position,
    "data-ad-state": "waiting",
    style: `min-width: ${styleMinW}; min-height: ${styleMinH}; display: block;`
  }, [
    createElement("span", { class: "ad-fallback-text" }, [fallbackText])
  ]);

  const config = { adNetworkInit, fallbackNetworks, refreshInterval, debug };

  if (debug) {
    console.warn(`[Ad System] Created slot ${slotId} [${width}x${height}] (Page: ${resolvedPage}, Refresh: ${refreshInterval}ms)`);
  }

  if (sharedAdObserver) {
    adConfigs.set(slotEl, config);
    sharedAdObserver.observe(slotEl);
  } else {
    triggerAdInitialization(slotEl, config);
  }

  return slotEl;
}

/**
 * Creates a semantic <section> wrapper for an ad placement.
 * 
 * @param {string} [position=""] - Slot position (e.g., "top", "sidebar", "aside")
 * @param {string} [page] - Target page context identifier (Defaults to URL path)
 * @param {object} [options={}] - Configuration options passed through to advertEmbed
 */
export function adspace(position = "", page, options = {}) {
  const sanitizePos = position || "default";
  const resolvedPage = resolvePageContext(page);
  
  return createElement("section", { 
    class: `advert advert-${sanitizePos}`.trim(),
    "aria-label": t("common.advertisement", {}, "Advertisement")
  }, [
    advertEmbed(resolvedPage, position, options)
  ]);
}