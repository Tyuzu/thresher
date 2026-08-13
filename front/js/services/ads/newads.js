// src/utils/newads.js
import "../../../css/subpages/sda.css";
import { createElement } from "../../components/createElement.js";
import { t } from "../../i18n/i18n.js";

let adCounter = 0;

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
      return path.split("/")[0];
    }
  }
  return "home";
}

/**
 * Secondary Observer for IAB-Compliant Impression Tracking
 * Triggers beacon ONLY when ad is >= 50% visible in the viewport.
 */
const impressionObserver = (typeof window !== "undefined" && "IntersectionObserver" in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const slotEl = entry.target;
          const adId = slotEl.getAttribute("data-ad-id");
          const tracked = slotEl.getAttribute("data-impression-tracked");

          if (adId && tracked !== "true") {
            slotEl.setAttribute("data-impression-tracked", "true");
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
              navigator.sendBeacon(`/api/v1/sda/track-impression?id=${encodeURIComponent(adId)}`);
            }
            impressionObserver.unobserve(slotEl);
          }
        }
      });
    }, { threshold: 0.5 })
  : null;

/**
 * Default internal fetcher connecting directly to Go backend.
 */
async function defaultAdNetworkFetcher(slotEl) {
  const page = slotEl.getAttribute("data-page") || "home";
  const position = slotEl.getAttribute("data-position") || "";
  const category = slotEl.getAttribute("data-category") || "";

  const queryParams = new URLSearchParams({ page, position, category });
  const response = await fetch(`/api/v1/sda/sda?${queryParams.toString()}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Ad API error HTTP ${response.status}`);
  }

  const rawData = await response.json();

  const adData = {
    id: rawData.id || rawData.ID || "",
    link: rawData.link || rawData.Link || "",
    image: rawData.image || rawData.Image || "",
    title: rawData.title || rawData.Title || "",
    description: rawData.description || rawData.Description || "",
    badge: rawData.badge || rawData.Badge || t("common.sponsored", {}, "Sponsored"),
    cta: rawData.cta || rawData.CTA || t("common.learnMore", {}, "Learn More")
  };

  if (!adData.link || !adData.image) {
    throw new Error("Invalid ad payload received");
  }

  slotEl.innerHTML = "";
  slotEl.setAttribute("data-ad-id", adData.id);
  slotEl.setAttribute("data-impression-tracked", "false");

  const anchor = createElement("a", {
    href: adData.link,
    target: "_blank",
    rel: "noopener noreferrer",
    class: "ad-card-link"
  }, [
    createElement("div", { class: "ad-card-media" }, [
      createElement("img", {
        src: adData.image,
        alt: adData.title || "Advertisement",
        class: "ad-card-img",
        loading: "lazy"
      }),
      createElement("span", { class: "ad-badge" }, [adData.badge])
    ]),
    createElement("div", { class: "ad-card-content" }, [
      createElement("strong", { class: "ad-card-title" }, [adData.title]),
      ...(adData.description ? [createElement("p", { class: "ad-card-desc" }, [adData.description])] : []),
      createElement("div", { class: "ad-card-footer" }, [
        createElement("span", { class: "ad-card-cta" }, [adData.cta])
      ])
    ])
  ]);

  // Click Tracking Listener
  anchor.addEventListener("click", () => {
    if (adData.id && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/v1/sda/track-click?id=${encodeURIComponent(adData.id)}`);
    }
  });

  slotEl.appendChild(anchor);

  if (impressionObserver && adData.id) {
    impressionObserver.observe(slotEl);
  }
}

// Primary IntersectionObserver for Lazy-Loading
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
          if (config.refreshInterval && slotEl.getAttribute("data-ad-state") === "loaded") {
            startRefreshTimer(slotEl, config);
          }
        } else {
          stopRefreshTimer(slotEl);
        }
      });
    }, { rootMargin: "200px" })
  : null;

async function triggerAdInitialization(slotEl, config) {
  const { adNetworkInit, fallbackNetworks = [], debug } = config;

  slotEl.setAttribute("data-ad-state", "loading");

  const networksToTry = [];
  if (typeof adNetworkInit === "function") {
    networksToTry.push(adNetworkInit);
  } else {
    networksToTry.push(defaultAdNetworkFetcher);
  }

  if (Array.isArray(fallbackNetworks)) {
    networksToTry.push(...fallbackNetworks.filter(fn => typeof fn === "function"));
  }

  let initialized = false;

  for (let i = 0; i < networksToTry.length; i++) {
    const netFn = networksToTry[i];
    try {
      if (debug) console.warn(`[Ad System] Trying provider ${i + 1} for ${slotEl.id}`);
      await Promise.resolve(netFn(slotEl));

      slotEl.setAttribute("data-ad-state", "loaded");
      slotEl.setAttribute("data-ad-provider", `provider-${i + 1}`);
      initialized = true;

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

function startRefreshTimer(slotEl, config) {
  stopRefreshTimer(slotEl);
  const interval = Math.max(config.refreshInterval, 10000);

  const timerId = setInterval(() => {
    if (document.hidden) return;

    if (config.debug) {
      console.warn(`[Ad System] Auto-refreshing slot: ${slotEl.id}`);
    }

    slotEl.setAttribute("data-ad-state", "waiting");
    triggerAdInitialization(slotEl, config);
  }, interval);

  adRefreshTimers.set(slotEl, timerId);
}

function stopRefreshTimer(slotEl) {
  if (adRefreshTimers.has(slotEl)) {
    clearInterval(adRefreshTimers.get(slotEl));
    adRefreshTimers.delete(slotEl);
  }
}

export function destroyAdSlot(slotEl) {
  if (!slotEl) return;
  stopRefreshTimer(slotEl);
  if (sharedAdObserver) sharedAdObserver.unobserve(slotEl);
  if (impressionObserver) impressionObserver.unobserve(slotEl);
  adConfigs.delete(slotEl);
}

export function advertEmbed(page, position = "", options = {}) {
  adCounter++;

  const resolvedPage = resolvePageContext(page);

  const {
    category = "",
    layout = "horizontal", // "horizontal" | "vertical" | "banner" | "compact"
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
  const styleMinH = typeof height === "number" ? `${height}px` : height;

  const slotEl = createElement("div", {
    id: slotId,
    class: `ad-slot ad-layout-${layout} ${classes}`.trim(),
    "data-page": resolvedPage,
    "data-position": position,
    "data-category": category,
    "data-ad-layout": layout,
    "data-ad-state": "waiting",
    style: `min-height: ${styleMinH};`
  }, [
    createElement("div", { class: "ad-skeleton" }, [
      createElement("div", { class: "ad-skeleton-img" }),
      createElement("div", { class: "ad-skeleton-lines" }, [
        createElement("div", { class: "ad-skeleton-line short" }),
        createElement("div", { class: "ad-skeleton-line medium" })
      ])
    ]),
    createElement("span", { class: "ad-fallback-text" }, [fallbackText])
  ]);

  const config = { adNetworkInit, fallbackNetworks, refreshInterval, debug };

  if (debug) {
    console.warn(`[Ad System] Created slot ${slotId} [Layout: ${layout}]`);
  }

  if (sharedAdObserver) {
    adConfigs.set(slotEl, config);
    sharedAdObserver.observe(slotEl);
  } else {
    triggerAdInitialization(slotEl, config);
  }

  return slotEl;
}

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