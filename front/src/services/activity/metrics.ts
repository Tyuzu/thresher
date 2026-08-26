// src/utils/activityLogger.ts
import { generateUUID } from "../../utils/genUUID.js";
import { sendActivityBatch } from "./api.js";

// --- Types & Interfaces ---
export type EventType =
  | "pageview"
  | "click"
  | "scroll"
  | "input_focus"
  | "time_on_page"
  | "button_click"
  | "purchase"
  | (string & {});

export interface AnalyticsEvent {
  type: EventType;
  data?: Record<string, unknown>;
  ts?: number;
}

export interface EnqueuedEvent extends AnalyticsEvent {
  ts: number;
}

export interface BatchMetadata {
  lang: string;
  platform: string;
  referrer: string;
  url: string;
  ua: string;
  screen: string;
  session: string;
  user: string;
}

export interface BatchPayload {
  meta: BatchMetadata;
  events: EnqueuedEvent[];
}

// --- Constants ---
// endpoint moved to activity API helper
const STORAGE_KEY = "__analytics_queue_v2__";
const INTERVAL_MS = 10000;
const MAX_BATCH = 20;
const MAX_RETRY_DELAY = 60000;
const RETRY_MULTIPLIER = 2;
const MAX_DEDUP_SIZE = 100;

// --- IDs ---
const SESSION_ID: string = (() => {
  const key = "__session_id__";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
})();

const USER_ID: string = (() => {
  const key = "__user_id__";
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(key, id);
  }
  return id;
})();

// --- Safe Storage Wrapper ---
function getStorageQueue(): EnqueuedEvent[] {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? (JSON.parse(item) as EnqueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function setStorageQueue(queue: EnqueuedEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Handle QuotaExceededError gracefully
  }
}

// Safely remove specifically flushed items (prevents multi-tab race conditions)
function removeFlushedItems(sentEvents: EnqueuedEvent[]): void {
  const currentQueue = getStorageQueue();
  const sentTimestamps = new Set<number>(sentEvents.map((e) => e.ts));
  const remaining = currentQueue.filter((item) => !sentTimestamps.has(item.ts));
  setStorageQueue(remaining);
}

// --- Queue Management ---
let isSyncing = false;
let retryDelay = 1000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function getBatchMetadata(): BatchMetadata {
  return {
    lang: navigator.language,
    platform: (navigator as { userAgentData?: { platform: string }; platform?: string }).platform || "unknown",
    referrer: document.referrer || "Direct",
    url: window.location.href,
    ua: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    session: SESSION_ID,
    user: USER_ID,
  };
}

// --- Queueing ---
function enqueue(event: AnalyticsEvent): void {
  const queue = getStorageQueue();
  queue.push({ ...event, ts: Date.now() });
  setStorageQueue(queue);

  if (queue.length >= MAX_BATCH) {
    void flush();
  }
}

// --- Core Sync ---
async function flush(isUnloading = false): Promise<void> {
  const queue = getStorageQueue();

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

  const payload: BatchPayload = {
    meta: getBatchMetadata(),
    events: eventsToSend,
  };

  const jsonPayload = JSON.stringify(payload);

  // Modern unload mechanism and regular POST are handled by helper
  if (isUnloading) {
    try {
      await sendActivityBatch(payload, true);
    } catch {
      // best-effort
    }

    removeFlushedItems(eventsToSend);
    return;
  }

  try {
    await sendActivityBatch(payload, false);

    removeFlushedItems(eventsToSend);

    retryDelay = 1000;
    isSyncing = false;

    if (getStorageQueue().length >= MAX_BATCH) {
      void flush();
    }
  } catch {
    isSyncing = false;
    if (!navigator.onLine) return;

    retryDelay = Math.min(retryDelay * RETRY_MULTIPLIER, MAX_RETRY_DELAY);
    retryTimer = setTimeout(() => {
      if (navigator.onLine) void flush();
    }, retryDelay);
  }
}

// --- Tracking ---
function track(type: EventType, data: Record<string, unknown> = {}): void {
  enqueue({ type, data });
}

// Bounded Deduplicated tracking
const seenEvents = new Set<string>();
function dedupTrack(key: string, type: EventType, data: Record<string, unknown> = {}): void {
  if (seenEvents.has(key)) return;

  if (seenEvents.size >= MAX_DEDUP_SIZE) {
    const firstKey = seenEvents.values().next().value;
    if (firstKey !== undefined) {
      seenEvents.delete(firstKey);
    }
  }

  seenEvents.add(key);
  track(type, data);
}

// Throttle helper
function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

// --- Automatic Event Handlers ---
track("pageview");

document.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as Element | null;
  if (!target) return;

  const el = target.closest<HTMLAnchorElement | HTMLButtonElement>("a, button");
  if (!el) return;

  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute("aria-label") || el.getAttribute("data-analytics-label") || "";
  const href = el instanceof HTMLAnchorElement ? el.href : null;

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

document.addEventListener("focusin", (e: FocusEvent) => {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || !el.tagName) return;

  if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.type !== "password") {
    track("input_focus", { name: el.name || el.id || "unnamed", type: el.type || "text" });
  }
});

// --- Tab Lifecycle Handling ---
const pageStart = Date.now();

function handleVisibilityOrPageHide(e: Event): void {
  if (e.type === "pagehide" || document.visibilityState === "hidden") {
    const duration = Math.round((Date.now() - pageStart) / 1000);
    track("time_on_page", { duration_sec: duration });
    void flush(true);
  }
}

window.addEventListener("visibilitychange", handleVisibilityOrPageHide);
window.addEventListener("pagehide", handleVisibilityOrPageHide);

// --- Network & Timers ---
window.addEventListener("online", () => {
  retryDelay = 1000;
  void flush();
});

setInterval(() => void flush(), INTERVAL_MS);

// --- Public API ---
export const trackPageView = (): void => track("pageview");
export const trackButtonClick = (buttonName: string): void => track("button_click", { button: buttonName });
export const trackPurchase = (itemId: string | number, price: number): void => track("purchase", { itemId, price });

export { track, dedupTrack, flush };