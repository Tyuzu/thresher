// apiClient.js

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

import Notify from "../components/ui/Notify.mjs";
import { silentLogout } from "../services/auth/authService.js";
import { refreshToken, isTokenNearExpiry } from "./authManager.js";

/* =========================
    CORE FETCH
========================= */

async function apixFetch(endpoint, method = "GET", body = null, options = {}, retry = false) {
    try {
        const token = getState("token");
        const nearExpiry = token && isTokenNearExpiry(token);

        // 1. Proactive Refresh if access token is near expiry
        if (nearExpiry && !retry) {
            const ok = await refreshToken();
            if (!ok) {
                silentLogout();
                throw new Error("Unauthorized");
            }
        }

        const fetchOptions = {
            method,
            credentials: options.credentials ?? "include", // Essential for HttpOnly refresh cookie transmission
            headers: {},
            signal: options.signal
        };

        if (options.auth !== false && getState("token")) {
            fetchOptions.headers.Authorization = `Bearer ${getState("token")}`;
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

        // 2. Handle 401 Unauthorized (Expired Access Token or Invalid Session)
        if (res.status === 401 && !retry) {
            const refreshed = await refreshToken();

            if (refreshed) {
                // Retry the original request once with the new access token
                return apixFetch(
                    endpoint,
                    method,
                    body,
                    options,
                    true
                );
            }

            // Refresh failed (cookie expired, missing, or invalidated by backend) -> log out
            silentLogout();
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
            throw new Error(
                data?.error ||
                data?.message ||
                `HTTP ${res.status}`
            );
        }

        return data ?? { success: true };

    } catch (err) {
        throw err;
    }
}

/* =========================
    PUBLIC API
========================= */

export async function apiFetch(endpoint, method = "GET", body = null, options = {}) {
    try {
        return await apixFetch(`${API_URL}${endpoint}`, method, body, options);
    } catch (err) {
        if (err?.message === "Unauthorized") {
            silentLogout();
        } else {
            Notify(err?.message || "Network error", { type: "error" });
        }
        throw err;
    }
}

export const liveFetch = (e, m, b, o) => apixFetch(`${LIVE_URL}${e}`, m, b, o);
export const bannerFetch = (e, m, b, o) => apixFetch(`${BANNERDROP_URL}${e}`, m, b, o);
export const chatFetch = (e, m, b, o) => apixFetch(`${CHAT_URL}${e}`, m, b, o);
export const mereFetch = (e, m, b, o) => apixFetch(`${MERE_URL}${e}`, m, b, o);

export const stripeFetch = (e, m, b, o) =>
    apixFetch(`${STRIPE_URL}${e}`, m, b, { ...o, auth: false });

export const musicFetch = (e, m, b, o) =>
    apixFetch(`${MUSIC_URL}${e}`, m, b, o);

export {
    apixFetch,
    API_URL,
    SRC_URL
};