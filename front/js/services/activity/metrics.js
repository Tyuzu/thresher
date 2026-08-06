// src/utils/activityLogger.js
import { API_URL, generateUUID } from "../../api/api.js";

const ENDPOINT = "/scitylana/event";
const STORAGE_KEY = "__analytics_queue_v2__";
const INTERVAL_MS = 10000;
const MAX_BATCH = 20;
const MAX_RETRY_DELAY = 60000;
const RETRY_MULTIPLIER = 2;
const MAX_DEDUP_SIZE = 100;

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

// --- Safe Storage Wrapper ---
function getStorageQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function setStorageQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (_) {
    // Handle QuotaExceededError gracefully
  }
}

// --- Queue Management ---
let isSyncing = false;
let retryDelay = 1000;
let retryTimer = null;

function getBatchMetadata() {
  return {
    lang: navigator.language,
    platform: navigator.platform,
    referrer: document.referrer || "Direct",
    url: window.location.href,
    ua: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    session: SESSION_ID,
    user: USER_ID,
  };
}

// --- Queueing ---
function enqueue(event) {
  const queue = getStorageQueue();
  queue.push({ ...event, ts: Date.now() });
  setStorageQueue(queue);

  if (queue.length >= MAX_BATCH) {
    flush();
  }
}

// --- Core Sync ---
async function flush(isUnloading = false) {
  let queue = getStorageQueue();

  if (!queue.length || (!navigator.onLine && !isUnloading) || (isSyncing && !isUnloading)) {
    return;
  }

  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  isSyncing = true;

  const batchSize = Math.min(queue.length, MAX_BATCH);
  const eventsToSend = queue.slice(0, batchSize);

  const payload = JSON.stringify({
    meta: getBatchMetadata(),
    events: eventsToSend,
  });

  // Modern unload mechanism: sendBeacon -> keepalive fetch
  if (isUnloading) {
    const endpointUrl = `${API_URL}${ENDPOINT}`;
    let sent = false;

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      sent = navigator.sendBeacon(endpointUrl, blob);
    }

    if (!sent) {
      fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }

    // Remove dispatched payload from queue upon unload
    setStorageQueue(queue.slice(batchSize));
    return;
  }

  try {
    const res = await fetch(`${API_URL}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (res.ok) {
      // Re-read storage in case another tab enqueued items during fetch
      queue = getStorageQueue();
      setStorageQueue(queue.slice(batchSize));

      retryDelay = 1000;
      isSyncing = false;

      if (getStorageQueue().length >= MAX_BATCH) {
        flush();
      }
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    isSyncing = false;
    if (!navigator.onLine) return;

    retryDelay = Math.min(retryDelay * RETRY_MULTIPLIER, MAX_RETRY_DELAY);
    retryTimer = setTimeout(() => {
      if (navigator.onLine) flush();
    }, retryDelay);
  }
}

// --- Tracking ---
function track(type, data = {}) {
  enqueue({ type, data });
}

// Bounded Deduplicated tracking (FIFO Set to avoid memory leak)
const seenEvents = new Set();
function dedupTrack(key, type, data = {}) {
  if (seenEvents.has(key)) return;

  if (seenEvents.size >= MAX_DEDUP_SIZE) {
    const firstKey = seenEvents.values().next().value;
    seenEvents.delete(firstKey);
  }

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

// --- Automatic Event Handlers ---
track("pageview");

document.addEventListener("click", (e) => {
  const el = e.target.closest("a, button");
  if (!el) return;

  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute("aria-label") || el.getAttribute("data-analytics-label") || "";
  const href = el.href || null;

  track("click", { tag, label, href });
});

document.addEventListener(
  "scroll",
  throttle(() => {
    const denominator = document.documentElement.scrollHeight - window.innerHeight;
    const scroll = denominator > 0 ? Math.round((window.scrollY / denominator) * 100) : 0;
    track("scroll", { scroll });
  }, 5000)
);

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.type !== "password") {
    track("input_focus", { name: el.name || el.id || "unnamed", type: el.type || "text" });
  }
});

// --- Modern Tab Lifecycle Handling ---
const pageStart = Date.now();

function handleVisibilityOrPageHide(e) {
  if (e.type === "pagehide" || document.visibilityState === "hidden") {
    const duration = Math.round((Date.now() - pageStart) / 1000);
    track("time_on_page", { duration_sec: duration });
    flush(true);
  }
}

window.addEventListener("visibilitychange", handleVisibilityOrPageHide);
window.addEventListener("pagehide", handleVisibilityOrPageHide);

// --- Network & Timers ---
window.addEventListener("online", () => {
  retryDelay = 1000;
  flush();
});

setInterval(flush, INTERVAL_MS);

// --- Public API ---
export const trackPageView = () => track("pageview");
export const trackButtonClick = (buttonName) => track("button_click", { button: buttonName });
export const trackPurchase = (itemId, price) => track("purchase", { itemId, price });

export { track, dedupTrack, flush };