import {
  API_URL,
  SRC_URL,
  CHAT_URL,
  BANNERDROP_URL,
  LIVE_URL,
  MERE_URL,
  STRIPE_URL,
  MUSIC_URL,
  getState,
  setState
} from "../state/state.js";

import Notify from "../components/ui/Notify.mjs";
import { silentLogout } from "../services/auth/authService.js";

const REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2-minute refresh buffer
const REFRESH_LOCK_TTL = 10_000;        // 10-second timeout fallback

const TAB_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : generateUUID();

const REFRESH_LOCK_KEY = "__refresh_lock__";
const AUTH_CHANNEL = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("auth_channel") : null;

// Navigation level request cancellation controller (Feature #19)
let navigationAbortController = new AbortController();

/**
 * Aborts all in-flight API requests triggered by the previous page.
 * Call this inside your router's beforeEnter/beforeLoad navigation lifecycle hooks.
 */
export function abortInflightApiRequests() {
  navigationAbortController.abort();
  navigationAbortController = new AbortController();
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safely parses JWT payload without external library dependencies.
 */
export function parseJwt(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;

    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isTokenNearExpiry(token, bufferMs = REFRESH_BUFFER_MS) {
  const payload = parseJwt(token);
  if (!payload?.exp) return false;

  return Date.now() > payload.exp * 1000 - bufferMs;
}

// Multi-Tab Coordination via Web Locks API with fallback
async function withRefreshLock(taskCallback) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("auth_refresh_lock", async () => {
      return await taskCallback();
    });
  }

  // Fallback for environments lacking Web Locks API
  const now = Date.now();
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (now - (lock.ts || 0) < REFRESH_LOCK_TTL && lock.owner !== TAB_ID) {
        return false;
      }
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner: TAB_ID, ts: now }));
  } catch {}

  try {
    return await taskCallback();
  } finally {
    try {
      const raw = localStorage.getItem(REFRESH_LOCK_KEY);
      if (raw && JSON.parse(raw).owner === TAB_ID) {
        localStorage.removeItem(REFRESH_LOCK_KEY);
      }
    } catch {}
  }
}

// Single-flight token refresh promise (Feature #7 / Auth spec)
let refreshPromise = null;

export async function refreshToken() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  // Return existing in-flight promise if multiple concurrent calls trigger 401
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    let success = false;

    await withRefreshLock(async () => {
      // Re-check token inside lock scope in case another tab already performed the refresh
      const currentToken = getState("token");
      if (currentToken && !isTokenNearExpiry(currentToken)) {
        success = true;
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include", // Sends HttpOnly cookie
          headers: {
            "Content-Type": "application/json",
            "X-Refresh-Intent": "1"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          success = false;
          return;
        }

        const data = await res.json().catch(() => null);
        const token = data?.data?.token || data?.token || data?.Token;

        if (!token) {
          success = false;
          return;
        }

        const parsed = parseJwt(token);
        if (!parsed) {
          success = false;
          return;
        }

        const userId = parsed.userId || parsed.userID || parsed.user_id || parsed.sub || "";

        const authPayload = {
          token,
          user: userId,
          userId,
          username: parsed.username || "",
          roles: Array.isArray(parsed.roles || parsed.role)
            ? parsed.roles || parsed.role
            : parsed.role ? [parsed.role] : [],
          permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
          isAuthenticated: true
        };

        setState(authPayload, true);

        AUTH_CHANNEL?.postMessage({
          type: "TOKEN_REFRESHED",
          payload: authPayload
        });

        success = true;
      } catch (err) {
        if (err.name === "AbortError") {
          console.warn("[Auth] Token refresh request timed out.");
        } else {
          console.error("[Auth] Token refresh request failed:", err);
        }
        success = false;
      }
    });

    return success;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

let refreshTimer = null;

export function scheduleBackgroundRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const token = getState("token");
  if (!token) return;

  const payload = parseJwt(token);
  if (!payload?.exp) return;

  const delay = payload.exp * 1000 - REFRESH_BUFFER_MS - Date.now();

  const handleScheduledRefresh = () => {
    refreshToken().then((ok) => {
      if (!ok && getState("token")) {
        silentLogout();
      }
    });
  };

  if (delay <= 0) {
    handleScheduledRefresh();
    return;
  }

  refreshTimer = setTimeout(handleScheduledRefresh, delay);
}

// Multi-Tab Synchronization Listeners
AUTH_CHANNEL?.addEventListener("message", (e) => {
  if (e.data?.type === "TOKEN_REFRESHED") {
    if (e.data.payload) {
      setState(e.data.payload, true);
    }
    scheduleBackgroundRefresh();
  }

  if (e.data?.type === "LOGOUT") {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }
});

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const token = getState("token");
      if (token && isTokenNearExpiry(token)) {
        refreshToken().then((ok) => {
          if (!ok) silentLogout();
        });
      } else {
        scheduleBackgroundRefresh();
      }
    }
  });
}

scheduleBackgroundRefresh();

/**
 * Base Core Fetching Engine
 */
async function apixFetch(endpoint, method = "GET", body = null, options = {}, retry = false) {
  try {
    const token = getState("token");
    const nearExpiry = token && isTokenNearExpiry(token);

    if (nearExpiry && !retry) {
      const ok = await refreshToken();
      if (!ok) {
        throw new Error("Unauthorized");
      }
    }

    // Attach navigation cancel signal unless overridden (Feature #19)
    const signal = options.signal || navigationAbortController.signal;

    const fetchOptions = {
      method,
      credentials: options.credentials ?? "include",
      headers: { ...(options.headers || {}) },
      signal
    };

    const currentToken = getState("token");
    if (options.auth !== false && currentToken) {
      fetchOptions.headers.Authorization = `Bearer ${currentToken}`;
    }

    if (body) {
      if (body instanceof FormData) {
        fetchOptions.body = body;
      } else {
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(body);
      }
    }

    const res = await fetch(endpoint, fetchOptions);

    if (res.status === 401 && !retry) {
      const refreshed = await refreshToken();

      if (refreshed) {
        return apixFetch(endpoint, method, body, options, true);
      }

      throw new Error("Unauthorized");
    }

    let data = null;

    try {
      const text = await res.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      return { success: false, error: "Invalid JSON response" };
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }

    return data ?? { success: true };

  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`[API] Request aborted: ${endpoint}`);
    }
    throw err;
  }
}

/**
 * Primary API Client Wrapper
 */
export async function apiFetch(endpoint, method = "GET", body = null, options = {}) {
  try {
    return await apixFetch(`${API_URL}${endpoint}`, method, body, options);
  } catch (err) {
    if (err?.name === "AbortError") throw err;

    if (err?.message === "Unauthorized") {
      silentLogout();
    } else {
      Notify(err?.message || "Network error", { type: "error" });
    }
    throw err;
  }
}

/**
 * HTTP Method Shorthand Layer (Feature #18)
 */
export const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, "GET", null, options),
  post: (endpoint, body, options = {}) => apiFetch(endpoint, "POST", body, options),
  put: (endpoint, body, options = {}) => apiFetch(endpoint, "PUT", body, options),
  patch: (endpoint, body, options = {}) => apiFetch(endpoint, "PATCH", body, options),
  delete: (endpoint, options = {}) => apiFetch(endpoint, "DELETE", null, options)
};

// Specialized Domain Endpoints
export const liveFetch = (e, m, b, o) => apixFetch(`${LIVE_URL}${e}`, m, b, o);
export const bannerFetch = (e, m, b, o) => apixFetch(`${BANNERDROP_URL}${e}`, m, b, o);
export const chatFetch = (e, m, b, o) => apixFetch(`${CHAT_URL}${e}`, m, b, o);
export const mereFetch = (e, m, b, o) => apixFetch(`${MERE_URL}${e}`, m, b, o);

export const stripeFetch = (e, m, b, o) =>
  apixFetch(`${STRIPE_URL}${e}`, m, b, { ...o, auth: false });

export const musicFetch = (e, m, b, o) =>
  apixFetch(`${MUSIC_URL}${e}`, m, b, o);

export { apixFetch, API_URL, SRC_URL };