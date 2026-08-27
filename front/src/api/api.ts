import {
  API_URL,
  SRC_URL,
  CHAT_URL,
  BANNERDROP_URL,
  LIVE_URL,
  MERE_URL,
  STRIPE_URL,
  MUSIC_URL,
  getState
} from "../state/state.js";
import Notify from "../components/ui/Notify.js";
import {
  isTokenNearExpiry,
  refreshToken,
  navigationAbortController
} from "./apiAuth.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */
export interface ApiFetchOptions {
  auth?: boolean;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  responseType?: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/* =========================================================
   LOW-LEVEL FETCH
========================================================= */
async function apixFetch<T = any>(
  endpoint: string,
  method: HttpMethod = "GET",
  body: unknown = null,
  options: ApiFetchOptions = {},
  retry = false
): Promise<T> {
  try {
    const token = getState("token");
    const nearExpiry = token && isTokenNearExpiry(token);

    if (options.auth !== false && nearExpiry && !retry) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        throw new Error("Unauthorized");
      }
    }

    const signal = options.signal || navigationAbortController.signal;
    const fetchOptions: RequestInit & { headers: Record<string, string> } = {
      method,
      credentials: options.credentials ?? "include",
      headers: {
        ...(options.headers || {})
      },
      signal
    };

    const currentToken = getState("token");
    if (options.auth !== false && currentToken) {
      fetchOptions.headers['Authorization'] = `Bearer ${currentToken}`;
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

    if (response.status === 401 && !retry && options.auth !== false) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return apixFetch<T>(endpoint, method, body, options, true);
      }
      throw new Error("Unauthorized");
    }

    let data: any = null;
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return { success: true } as unknown as T;
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    }

    return (data ?? { success: true }) as T;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[API] Request aborted: ${endpoint}`);
    }
    throw error;
  }
}

/* =========================================================
   MAIN API WRAPPER
========================================================= */
export async function apiFetch<T = any>(
  endpoint: string,
  method: HttpMethod = "GET",
  body: unknown = null,
  options: ApiFetchOptions = {}
): Promise<T> {
  try {
    return await apixFetch<T>(`${API_URL}${endpoint}`, method, body, options);
  } catch (error: unknown) {
    const err = error as Error;
    if (err?.name === "AbortError") {
      throw error;
    }
    if (err?.message === "Unauthorized") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    } else {
      Notify(err?.message || "Network error", {
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
  get: <T = any>(endpoint: string, options: ApiFetchOptions = {}) =>
    apiFetch<T>(endpoint, "GET", null, options),
  post: <T = any>(endpoint: string, body?: unknown, options: ApiFetchOptions = {}) =>
    apiFetch<T>(endpoint, "POST", body, options),
  put: <T = any>(endpoint: string, body?: unknown, options: ApiFetchOptions = {}) =>
    apiFetch<T>(endpoint, "PUT", body, options),
  patch: <T = any>(endpoint: string, body?: unknown, options: ApiFetchOptions = {}) =>
    apiFetch<T>(endpoint, "PATCH", body, options),
  delete: <T = any>(endpoint: string, options: ApiFetchOptions = {}) =>
    apiFetch<T>(endpoint, "DELETE", null, options)
};

/* =========================================================
   DOMAIN ENDPOINTS
========================================================= */
export const liveFetch = <T = any>(endpoint: string, method: HttpMethod, body?: unknown, options?: ApiFetchOptions) =>
  apixFetch<T>(`${LIVE_URL}${endpoint}`, method, body, options);

export const bannerFetch = <T = any>(endpoint: string, method: HttpMethod, body?: unknown, options?: ApiFetchOptions) =>
  apixFetch<T>(`${BANNERDROP_URL}${endpoint}`, method, body, options);

export const chatFetch = <T = any>(endpoint: string, method: HttpMethod, body?: unknown, options?: ApiFetchOptions) =>
  apixFetch<T>(`${CHAT_URL}${endpoint}`, method, body, options);

export const mereFetch = <T = any>(endpoint: string, method: HttpMethod, body?: unknown, options?: ApiFetchOptions) =>
  apixFetch<T>(`${MERE_URL}${endpoint}`, method, body, options);

export const stripeFetch = <T = any>(endpoint: string, method: HttpMethod, body?: unknown, options?: ApiFetchOptions) =>
  apixFetch<T>(`${STRIPE_URL}${endpoint}`, method, body, {
    ...options,
    auth: false
  });

export const musicFetch = <T = any>(endpoint: string, method: HttpMethod, body?: unknown, options?: ApiFetchOptions) =>
  apixFetch<T>(`${MUSIC_URL}${endpoint}`, method, body, options);

export { apixFetch, API_URL, SRC_URL };