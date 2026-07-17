// src/utils/activityLogger.js
import { API_URL, generateUUID } from "../../api/api.js";

const ENDPOINT = "/scitylana/event"; // Fun reverse-engineering protection!
const STORAGE_KEY = "__analytics_queue__";
const INTERVAL_MS = 10000;
const MAX_BATCH = 20;
const MAX_RETRY_DELAY = 60000;
const RETRY_MULTIPLIER = 2;

// --- IDs ---
const SESSION_ID = (() => {
  const key = "__session_id__";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
})();

const USER_ID = (() => {
  const key = "__user_id__";
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(key, id);
  }
  return id;
})();

// --- Queue Management ---
let queue = loadQueue();
let isSyncing = false;
let retryDelay = 1000;
let retryTimer = null;

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveQueue() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

// --- Environment & metadata ---
function getEnvInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    lang: navigator.language,
    platform: navigator.platform,
    referrer: document.referrer || "Direct",
    url: window.location.href,
    ua: navigator.userAgent,
  };
}

// --- Queueing ---
function enqueue(event) {
  queue.push({ ...event, ts: Date.now() });
  saveQueue();
  if (queue.length >= MAX_BATCH) {
    flush();
  }
}

// --- Core sync ---
async function flush(isUnloading = false) {
  if (!queue.length || !navigator.onLine || (isSyncing && !isUnloading)) {
    return;
  }

  // Clear any existing retry timers to prevent stacking loops
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  isSyncing = true;
  
  // Take a snapshot of the current batch size to safely remove later
  const batchSize = Math.min(queue.length, MAX_BATCH * 2); 
  const payload = queue.slice(0, batchSize);

  // Fallback pattern for tab closure 
  if (isUnloading) {
    const body = JSON.stringify({ events: payload });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_URL}${ENDPOINT}`, body);
    } else {
      fetch(`${API_URL}${ENDPOINT}`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
    return;
  }

  async function attemptSend() {
    try {
      const res = await fetch(`${API_URL}${ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: payload }),
      });

      if (res.ok) {
        // FIX: Only remove the items that were actually transmitted
        queue = queue.slice(batchSize);
        saveQueue();
        
        retryDelay = 1000;
        isSyncing = false;
        
        // If items accumulated while we were sending, trigger another flush
        if (queue.length >= MAX_BATCH) {
          flush();
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("Activity sync failed:", err.message);
      
      if (!navigator.onLine) {
        isSyncing = false;
        return;
      }

      retryDelay = Math.min(retryDelay * RETRY_MULTIPLIER, MAX_RETRY_DELAY);
      retryTimer = setTimeout(() => {
        if (navigator.onLine) {
          attemptSend();
        } else {
          isSyncing = false;
        }
      }, retryDelay);
    }
  }

  attemptSend();
}

// --- Tracking ---
function track(type, data = {}) {
  enqueue({
    type,
    data,
    session: SESSION_ID,
    user: USER_ID,
    ...getEnvInfo(),
  });
}

// Deduplicated tracking
const seenEvents = new Set();
function dedupTrack(key, type, data = {}) {
  if (seenEvents.has(key)) return;
  seenEvents.add(key);
  track(type, data);
}

// Throttle helper
function throttle(fn, delay) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

// --- Automatic events ---
track("pageview");

document.addEventListener("click", (e) => {
  const el = e.target.closest("a, button");
  if (!el) return;
  
  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute("aria-label") || el.innerText?.trim().slice(0, 40) || "";
  const href = el.href || null;
  track("click", { tag, label, href });
});

document.addEventListener(
  "scroll",
  throttle(() => {
    const denominator = document.documentElement.scrollHeight - window.innerHeight;
    // FIX: Guard against zero division on short pages
    const scroll = denominator > 0 ? Math.round((window.scrollY / denominator) * 100) : 0;
    track("scroll", { scroll });
  }, 5000)
);

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    track("input_focus", { name: el.name || el.id || "unnamed", type: el.type || "text" });
  }
});

// --- Time on page ---
const pageStart = Date.now();
window.addEventListener("beforeunload", () => {
  const duration = Date.now() - pageStart;
  track("time_on_page", { duration });
  flush(true); // Pass true flag to use sendBeacon / keepalive fetch
});

// --- Network events ---
window.addEventListener("online", () => {
  retryDelay = 1000;
  flush();
});

// --- Periodic flush ---
setInterval(flush, INTERVAL_MS);

// --- Public API Alignment ---
function trackPageView() { track("pageview"); }
function trackButtonClick(buttonName) { track("button_click", { button: buttonName }); }
function trackPurchase(itemId, price) { track("purchase", { itemId, price }); }

export {
  track,
  dedupTrack,
  trackPageView,
  trackButtonClick,
  trackPurchase,
  flush,
};