import { API_URL, getState, setState } from "../state/state.js";
import { generateUUID } from "../utils/genUUID.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */
export interface JwtPayload {
  exp?: number;
  userid?: string;
  userID?: string;
  user_id?: string;
  sub?: string;
  username?: string;
  roles?: string[];
  role?: string | string[];
  permissions?: string[];
  [key: string]: unknown;
}

export interface AuthPayload {
  token: string;
  user: string | null;
  userid: string | null;
  username: string;
  roles: string[];
  permissions: string[];
  auth: {
    isAuthenticated: boolean;
    accessToken: string;
    user: string | null;
    roles: string[];
    permissions: string[];
  };
}

export interface LockResult {
  lockedByOtherTab?: boolean;
}

export interface RefreshLockData {
  owner: string;
  ts: number;
}

/* =========================================================
   CONSTANTS & INITIALIZATION
========================================================= */
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const REFRESH_LOCK_TTL = 10_000;
const REFRESH_WAIT_TIMEOUT = 12_000;
const TAB_ID = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : generateUUID();
const REFRESH_LOCK_KEY = "__refresh_lock__";
const AUTH_CHANNEL = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("auth_channel") : null;

/* =========================================================
   NAVIGATION REQUEST CANCELLATION
========================================================= */
export let navigationAbortController = new AbortController();

export function abortInflightApiRequests(): void {
  navigationAbortController.abort();
  navigationAbortController = new AbortController();
}

/* =========================================================
   JWT
========================================================= */
export function parseJwt(token: string | null | undefined): JwtPayload | null {
  try {
    const payload = token?.split(".")[1];
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenNearExpiry(token: string | null | undefined, bufferMs: number = REFRESH_BUFFER_MS): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) {
    return false;
  }
  return Date.now() > payload.exp * 1000 - bufferMs;
}

/* =========================================================
   REFRESH LOCK
========================================================= */
async function withRefreshLock<T>(taskCallback: () => Promise<T>): Promise<T | LockResult> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("auth_refresh_lock", async () => {
      return taskCallback();
    });
  }

  const now = Date.now();
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (raw) {
      const lock: RefreshLockData = JSON.parse(raw);
      const age = now - (lock.ts || 0);
      if (age < REFRESH_LOCK_TTL && lock.owner !== TAB_ID) {
        return { lockedByOtherTab: true };
      }
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner: TAB_ID, ts: now }));
  } catch {
    // Continue without cross-tab lock.
  }

  try {
    return await taskCallback();
  } finally {
    try {
      const raw = localStorage.getItem(REFRESH_LOCK_KEY);
      if (raw) {
        const lock: RefreshLockData = JSON.parse(raw);
        if (lock.owner === TAB_ID) {
          localStorage.removeItem(REFRESH_LOCK_KEY);
        }
      }
    } catch {
      // Ignore lock cleanup failures.
    }
  }
}

/* =========================================================
   WAIT FOR ANOTHER TAB
========================================================= */
function waitForTokenChange(previousToken: string | null, timeoutMs: number = REFRESH_WAIT_TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
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
let refreshPromise: Promise<boolean> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  if (refreshPromise) {
    return refreshPromise;
  }

  const previousToken = getState("token");

  refreshPromise = (async (): Promise<boolean> => {
    let success = false;

    const lockResult = await withRefreshLock(async () => {
      const currentToken = getState("token");
      if (currentToken && !isTokenNearExpiry(currentToken)) {
        success = true;
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

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

        const data = await response.json().catch(() => null);
        const token: string | undefined = data?.data?.token || data?.token || data?.Token;

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
        const roles = Array.isArray(parsed.roles || parsed.role)
          ? ((parsed.roles || parsed.role) as string[])
          : parsed.role
            ? [parsed.role as string]
            : [];
        const permissions = Array.isArray(parsed.permissions) ? parsed.permissions : [];

        const authPayload: AuthPayload = {
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
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          console.warn("[Auth] Token refresh request timed out.");
        } else {
          console.error("[Auth] Token refresh request failed:", error);
        }
        success = false;
      }
    });

    if (lockResult && "lockedByOtherTab" in lockResult && lockResult.lockedByOtherTab) {
      success = await waitForTokenChange(previousToken);
    }

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
export function scheduleBackgroundRefresh(): void {
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

  const handleRefresh = async (): Promise<void> => {
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
AUTH_CHANNEL?.addEventListener("message", (event: MessageEvent) => {
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
if (typeof window !== "undefined") {
  window.addEventListener("auth:logout", (event: CustomEventInit) => {
    if (!event.detail?.broadcast) {
      return;
    }
    AUTH_CHANNEL?.postMessage({
      type: "LOGOUT"
    });
  });
}

/* =========================================================
   VISIBILITY REFRESH
========================================================= */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      return;
    }
    const token = getState("token");
    if (token && isTokenNearExpiry(token)) {
      refreshToken().then((success) => {
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