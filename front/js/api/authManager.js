// authManager.js

import { API_URL, setState, getState } from "../state/state.js";
import { silentLogout } from "../services/auth/authService.js";

/* =========================
    CONSTANTS
========================= */

const REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes buffer
const REFRESH_LOCK_TTL = 10_000; // 10 seconds lock TTL

/* =========================
    MULTI-TAB MANAGEMENT
========================= */

const TAB_ID =
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : generateUUID();

const REFRESH_LOCK_KEY = "__refresh_lock__";
const AUTH_CHANNEL = new BroadcastChannel("auth_channel");

/* =========================
    HELPERS
========================= */

export function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

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

/* =========================
    LOCK MANAGEMENT
========================= */

function acquireRefreshLock() {
    const now = Date.now();

    try {
        const raw = localStorage.getItem(REFRESH_LOCK_KEY);

        if (raw) {
            const lock = JSON.parse(raw);
            if (now - (lock.ts || 0) < REFRESH_LOCK_TTL) {
                return lock.owner === TAB_ID;
            }
        }

        localStorage.setItem(
            REFRESH_LOCK_KEY,
            JSON.stringify({ owner: TAB_ID, ts: now })
        );

        return true;
    } catch {
        return true;
    }
}

function releaseRefreshLock() {
    try {
        const raw = localStorage.getItem(REFRESH_LOCK_KEY);
        if (!raw) return;

        const { owner } = JSON.parse(raw);
        if (owner === TAB_ID) {
            localStorage.removeItem(REFRESH_LOCK_KEY);
        }
    } catch {}
}

/* =========================
    TOKEN REFRESH LOGIC
========================= */

let refreshPromise = null;

export async function refreshToken() {
    // Return existing in-flight promise if a refresh is already underway
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        // If another tab holds the lock, wait for broadcast response or lock expiration
        if (!acquireRefreshLock()) {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (!e?.data) return;

                    if (e.data.type === "TOKEN_REFRESHED") {
                        AUTH_CHANNEL.removeEventListener("message", handler);
                        const token = getState("token");
                        resolve(Boolean(token && !isTokenNearExpiry(token)));
                    }

                    if (e.data.type === "LOGOUT") {
                        AUTH_CHANNEL.removeEventListener("message", handler);
                        resolve(false);
                    }
                };

                AUTH_CHANNEL.addEventListener("message", handler);

                setTimeout(() => {
                    AUTH_CHANNEL.removeEventListener("message", handler);
                    const token = getState("token");
                    resolve(Boolean(token && !isTokenNearExpiry(token)));
                }, REFRESH_LOCK_TTL);
            });
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include", // Essential for HttpOnly cookie transmission
                headers: {
                    "Content-Type": "application/json"
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                // If backend actively returns 401/403, the session is invalid
                return false;
            }

            const data = await res.json().catch(() => null);
            const token = data?.data?.token;

            if (!token) return false;

            const parsed = parseJwt(token);
            if (!parsed) return false;

            const userId =
                parsed.userId ||
                parsed.userID ||
                parsed.sub ||
                "";

            // Update app state with newly minted access token
            setState(
                {
                    token,
                    user: userId,
                    userId,
                    username: parsed.username || "",
                    role: parsed.role || []
                },
                true
            );

            // Notify other tabs that token refresh succeeded
            AUTH_CHANNEL.postMessage({ type: "TOKEN_REFRESHED" });

            return true;
        } catch (err) {
            if (err.name === "AbortError") {
                console.warn("[Auth] Token refresh timed out.");
            } else {
                console.error("[Auth] Token refresh request failed:", err);
            }
            return false;
        } finally {
            releaseRefreshLock();
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/* =========================
    BACKGROUND SCHEDULER
========================= */

let refreshTimer = null;

export function scheduleBackgroundRefresh() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    const token = getState("token");
    if (!token) return;

    const payload = parseJwt(token);
    if (!payload?.exp) return;

    const delay = payload.exp * 1000 - REFRESH_BUFFER_MS - Date.now();

    if (delay <= 0) {
        refreshToken().catch(() => {});
        return;
    }

    refreshTimer = setTimeout(() => {
        refreshToken().catch(() => {});
    }, delay);
}

/* =========================
    EVENT LISTENERS
========================= */

AUTH_CHANNEL.addEventListener("message", (e) => {
    if (e.data?.type === "TOKEN_REFRESHED") {
        scheduleBackgroundRefresh();
    }

    if (e.data?.type === "LOGOUT") {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
    }
});

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

// Initial boot schedule
scheduleBackgroundRefresh();