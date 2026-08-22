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
import Notify from "../components/ui/Notify.js";
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const REFRESH_LOCK_TTL = 10_000;
const REFRESH_WAIT_TIMEOUT = 12_000;
const TAB_ID = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : generateUUID();
const REFRESH_LOCK_KEY = "__refresh_lock__";
const AUTH_CHANNEL = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("auth_channel") : null;
/* =========================================================
   NAVIGATION REQUEST CANCELLATION
========================================================= */
let navigationAbortController = new AbortController();
export function abortInflightApiRequests() {
    navigationAbortController.abort();
    navigationAbortController = new AbortController();
}
/* =========================================================
   UUID
========================================================= */
export function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,
        (character) => {
            const random = (Math.random() * 16) | 0;
            const value = character === "x" ? random : (random & 0x3) | 0x8;
            return value.toString(16);
        });
}
/* =========================================================
   JWT
========================================================= */
export function parseJwt(token) {
    try {
        const payload = token?.split(".")[1];
        if (!payload) {
            return null;
        }
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat(
            (4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}
export function isTokenNearExpiry(token, bufferMs = REFRESH_BUFFER_MS) {
    const payload = parseJwt(token);
    if (!payload?.exp) {
        return false;
    }
    return (Date.now() > payload.exp * 1000 - bufferMs);
}
/* =========================================================
   REFRESH LOCK
========================================================= */
async function withRefreshLock(taskCallback) {
    if (typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request("auth_refresh_lock", async () => {
            return taskCallback();
        });
    }
    const now = Date.now();
    try {
        const raw = localStorage.getItem(REFRESH_LOCK_KEY);
        if (raw) {
            const lock = JSON.parse(raw);
            const age = now - (lock.ts || 0);
            if (age < REFRESH_LOCK_TTL && lock.owner !== TAB_ID) {
                /*
                 * Another tab owns the lock.
                 * Wait for it rather than reporting
                 * a refresh failure.
                 */
                return {
                    lockedByOtherTab: true
                };
            }
        }
        localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({
            owner: TAB_ID,
            ts: now
        }));
    } catch {
        // Continue without cross-tab lock.
    }
    try {
        return await taskCallback();
    } finally {
        try {
            const raw = localStorage.getItem(REFRESH_LOCK_KEY);
            if (!raw) {
                return;
            }
            const lock = JSON.parse(raw);
            if (lock.owner === TAB_ID) {
                localStorage.removeItem(REFRESH_LOCK_KEY);
            }
        } catch {
            // Ignore lock cleanup failures.
        }
    }
}
/* =========================================================
   WAIT FOR ANOTHER TAB
========================================================= */
function waitForTokenChange(previousToken, timeoutMs = REFRESH_WAIT_TIMEOUT) {
    return new Promise(
        (resolve) => {
            const started = Date.now();
            const timer = setInterval(() => {
                const currentToken = getState("token");
                if (currentToken && currentToken !== previousToken) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }
                if (Date.now() - started >= timeoutMs) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 100);
        });
}
/* =========================================================
   TOKEN REFRESH
========================================================= */
let refreshPromise = null;
let refreshTimer = null;
export async function refreshToken() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
    if (refreshPromise) {
        return refreshPromise;
    }
    const previousToken = getState("token");
    refreshPromise = (async () => {
        let success = false;
        const lockResult = await withRefreshLock(async () => {
            /*
             * Re-check after acquiring the lock.
             * Another request in this tab may already
             * have refreshed the token.
             */
            const currentToken = getState("token");
            if (currentToken && !isTokenNearExpiry(currentToken)) {
                success = true;
                return;
            }
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(
                    () => controller.abort(), 10_000);
                const response = await fetch(`${API_URL}/auth/refresh`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Refresh-Intent": "1"
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    success = false;
                    return;
                }
                const data = await response.json().catch(
                    () => null);
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
                const userId = parsed.userid || parsed.userID || parsed.user_id || parsed.sub || "";
                const roles = Array.isArray(parsed.roles || parsed.role) ? parsed.roles || parsed.role : parsed.role ? [parsed.role] : [];
                const permissions = Array.isArray(parsed.permissions) ? parsed.permissions : [];
                const authPayload = {
                    token,
                    user: userId || null,
                    userid: userId || null,
                    username: parsed.username || "",
                    roles,
                    permissions,
                    auth: {
                        isAuthenticated: true,
                        accessToken: token,
                        user: userId || null,
                        roles,
                        permissions
                    }
                };
                setState(authPayload, true);
                AUTH_CHANNEL?.postMessage({
                    type: "TOKEN_REFRESHED",
                    payload: authPayload
                });
                success = true;
            } catch (error) {
                if (error?.name === "AbortError") {
                    console.warn("[Auth] Token refresh request timed out.");
                } else {
                    console.error("[Auth] Token refresh request failed:", error);
                }
                success = false;
            }
        });
        /*
         * Web Locks path returns the task result.
         * localStorage fallback may tell us another
         * tab owns the lock.
         */
        if (lockResult?.lockedByOtherTab) {
            success = await waitForTokenChange(previousToken);
        }
        /*
         * Schedule the next refresh in this tab.
         */
        if (success) {
            scheduleBackgroundRefresh();
        }
        return success;
    })();
    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}
/* =========================================================
   BACKGROUND REFRESH
========================================================= */
export function scheduleBackgroundRefresh() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
    const token = getState("token");
    if (!token) {
        return;
    }
    const payload = parseJwt(token);
    if (!payload?.exp) {
        return;
    }
    const delay = payload.exp * 1000 - REFRESH_BUFFER_MS - Date.now();
    const handleRefresh = async () => {
        const success = await refreshToken();
        if (!success && getState("token")) {
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
    };
    if (delay <= 0) {
        handleRefresh();
        return;
    }
    refreshTimer = setTimeout(handleRefresh, delay);
}
/* =========================================================
   AUTH CHANNEL
========================================================= */
AUTH_CHANNEL?.addEventListener("message",
    (event) => {
        if (event.data?.type === "TOKEN_REFRESHED") {
            if (event.data.payload) {
                setState(event.data.payload, true);
            }
            scheduleBackgroundRefresh();
        }
        if (event.data?.type === "LOGOUT") {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
                refreshTimer = null;
            }
            window.dispatchEvent(new CustomEvent("auth:remote-logout"));
        }
    });
/* =========================================================
   LOCAL AUTH EVENTS
========================================================= */
window.addEventListener("auth:logout",
    (event) => {
        if (!event.detail?.broadcast) {
            return;
        }
        AUTH_CHANNEL?.postMessage({
            type: "LOGOUT"
        });
    });
/* =========================================================
   VISIBILITY REFRESH
========================================================= */
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange",
        () => {
            if (document.visibilityState !== "visible") {
                return;
            }
            const token = getState("token");
            if (token && isTokenNearExpiry(token)) {
                refreshToken().then(
                    (success) => {
                        if (!success) {
                            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
                        }
                    });
            } else {
                scheduleBackgroundRefresh();
            }
        });
}
/* =========================================================
   INITIAL REFRESH TIMER
========================================================= */
scheduleBackgroundRefresh();
/* =========================================================
   LOW-LEVEL FETCH
========================================================= */
async function apixFetch(endpoint, method = "GET", body = null, options = {}, retry = false) {
    try {
        const token = getState("token");
        const nearExpiry = token && isTokenNearExpiry(token);
        /*
         * Do not refresh for requests explicitly
         * marked auth:false.
         */
        if (options.auth !== false && nearExpiry && !retry) {
            const refreshed = await refreshToken();
            if (!refreshed) {
                throw new Error("Unauthorized");
            }
        }
        const signal = options.signal || navigationAbortController.signal;
        const fetchOptions = {
            method,
            credentials: options.credentials ?? "include",
            headers: {
                ...(options.headers || {})
            },
            signal
        };
        const currentToken = getState("token");
        if (options.auth !== false && currentToken) {
            fetchOptions.headers.Authorization = `Bearer ${currentToken}`;
        }
        if (body !== null && body !== undefined) {
            if (body instanceof FormData) {
                fetchOptions.body = body;
            } else {
                fetchOptions.headers["Content-Type"] = "application/json";
                fetchOptions.body = JSON.stringify(body);
            }
        }
        const response = await fetch(endpoint, fetchOptions);
        /* =====================================================
           401 RETRY
        ===================================================== */
        if (response.status === 401 && !retry && options.auth !== false) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return apixFetch(endpoint, method, body, options, true);
            }
            throw new Error("Unauthorized");
        }
        /* =====================================================
           RESPONSE
        ===================================================== */
        let data = null;
        try {
            const text = await response.text();
            if (text) {
                data = JSON.parse(text);
            }
        } catch {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return {
                success: true
            };
        }
        if (!response.ok) {
            throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
        }
        return (data ?? {
            success: true
        });
    } catch (error) {
        /*
         * Navigation cancellation is NOT an auth failure.
         */
        if (error?.name === "AbortError") {
            console.warn(`[API] Request aborted: ${endpoint}`);
        }
        throw error;
    }
}
/* =========================================================
   MAIN API WRAPPER
========================================================= */
export async function apiFetch(endpoint, method = "GET", body = null, options = {}) {
    try {
        return await apixFetch(`${API_URL}${endpoint}`, method, body, options);
    } catch (error) {
        if (error?.name === "AbortError") {
            throw error;
        }
        if (error?.message === "Unauthorized") {
            /*
             * Break the api.js <-> authService.js
             * circular dependency.
             */
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        } else {
            Notify(error?.message || "Network error", {
                type: "error"
            });
        }
        throw error;
    }
}
/* =========================================================
   HTTP SHORTCUTS
========================================================= */
export const api = {
    get: (endpoint, options = {}) => apiFetch(endpoint, "GET", null, options),
    post: (endpoint, body, options = {}) => apiFetch(endpoint, "POST", body, options),
    put: (endpoint, body, options = {}) => apiFetch(endpoint, "PUT", body, options),
    patch: (endpoint, body, options = {}) => apiFetch(endpoint, "PATCH", body, options),
    delete: (endpoint, options = {}) => apiFetch(endpoint, "DELETE", null, options)
};
/* =========================================================
   DOMAIN ENDPOINTS
========================================================= */
export const liveFetch = (endpoint, method, body, options) => apixFetch(`${LIVE_URL}${endpoint}`, method, body, options);
export const bannerFetch = (endpoint, method, body, options) => apixFetch(`${BANNERDROP_URL}${endpoint}`, method, body, options);
export const chatFetch = (endpoint, method, body, options) => apixFetch(`${CHAT_URL}${endpoint}`, method, body, options);
export const mereFetch = (endpoint, method, body, options) => apixFetch(`${MERE_URL}${endpoint}`, method, body, options);
export const stripeFetch = (endpoint, method, body, options) => apixFetch(`${STRIPE_URL}${endpoint}`, method, body, {
    ...options,
    auth: false
});
export const musicFetch = (endpoint, method, body, options) => apixFetch(`${MUSIC_URL}${endpoint}`, method, body, options);
export {
    apixFetch,
    API_URL,
    SRC_URL
};