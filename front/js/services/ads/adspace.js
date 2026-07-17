// src/utils/activityLogger.js
import { createElement } from "../../components/createElement.js";
import { t } from "../../i18n/i18n.js";

let adCounter = 0;

// Centralized Callback Map to tie DOM elements back to their respective initializers
const adCallbacks = new WeakMap();

// Singleton Observer Instance: Shared across all ad elements on the page
const sharedAdObserver = (typeof window !== "undefined" && "IntersectionObserver" in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const slotEl = entry.target;
          const initFn = adCallbacks.get(slotEl);
          
          if (initFn) {
            triggerAdInitialization(slotEl, initFn);
          }
          
          sharedAdObserver.unobserve(slotEl);
        }
      });
    }, { rootMargin: "200px" })
  : null;

/**
 * Safely initializes the ad network and updates DOM state attributes
 */
function triggerAdInitialization(slotEl, initFn) {
  slotEl.setAttribute("data-ad-state", "loading");
  try {
    initFn(slotEl);
    slotEl.setAttribute("data-ad-state", "loaded");
  } catch (err) {
    console.error("Ad network failed to initialize:", err);
    slotEl.setAttribute("data-ad-state", "failed");
  }
}

/**
 * Embed an advertisement slot with optimized lazy-loading & CLS protections.
 * @param {string} page - Page identifier (e.g., "homepage")
 * @param {string} position - Slot position (e.g., "top", "sidebar")
 * @param {object} options - Configuration object
 */
export function advertEmbed(page, position = "", options = {}) {
  adCounter++;

  const {
    classes = "",
    fallbackText = t("common.advertisement", {}, "Advertisement"),
    adNetworkInit = null,
    debug = false,
    // FIX: Pass dimensions to prevent Layout Shifts (CLS)
    width = "auto",
    height = "auto"
  } = options;

  // Use simple unique sequential naming. Timestamp is redundant alongside the incremental counter.
  const slotId = `ad-slot-${page}-${position || "default"}-${adCounter}`;

  const slotEl = createElement("div", {
    id: slotId,
    class: `ad-slot ${classes}`.trim(),
    "data-page": page,
    "data-position": position,
    "data-ad-state": "waiting",
    // Reserving physical constraints to avoid page layout jumps
    style: `min-width: ${typeof width === "number" ? width + "px" : width}; min-height: ${typeof height === "number" ? height + "px" : height}; display: block;`
  }, [
    createElement("span", { class: "ad-fallback-text" }, [fallbackText])
  ]);

  if (debug) {
    console.warn(`[Ad System] Slot created: ${slotId} (${width}x${height})`);
  }

  if (adNetworkInit) {
    if (sharedAdObserver) {
      // Map the function callback to this DOM element node reference
      adCallbacks.set(slotEl, adNetworkInit);
      sharedAdObserver.observe(slotEl);
    } else {
      // Immediate execution fallback for legacy environments
      triggerAdInitialization(slotEl, adNetworkInit);
    }
  }

  return slotEl;
}