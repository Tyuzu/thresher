/**
 * Environment Configuration
 * Vite + Netlify same-origin API configuration.
 */

export const webSiteName = "Agrinet";

// Normalize base URLs by removing trailing slashes
const MAIN_URL = (import.meta.env.VITE_MAIN_URL || "").replace(/\/+$/, "");
const BANNERDROP_URL = (import.meta.env.VITE_BANNERDROP_URL || "").replace(/\/+$/, "");
const MODE = import.meta.env.MODE || "development";

/**
 * Safely construct relative or absolute URLs.
 */
const buildURL = (baseURL, path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseURL ? `${baseURL}${normalizedPath}` : normalizedPath;
};

/**
 * Safely compute WebSocket URL with SSR & Relative Path fallbacks.
 */
const getWebSocketURL = () => {
  // 1. Explicit full API URL configured (e.g., http://localhost:4000)
  if (MAIN_URL) {
    try {
      const url = new URL(MAIN_URL, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      return url.toString().replace(/\/+$/, "");
    } catch {
      // Fallback for invalid URLs during build
      return MAIN_URL.replace(/^http/, "ws");
    }
  }

  // 2. Same-origin browser runtime
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  // 3. Fallback for Node/SSR environments
  return "";
};

const WS_URL = getWebSocketURL();

/**
 * Centralized API configuration.
 */
export const apiConfig = {
  /* Base URLs */
  MAIN_URL,
  BANNERDROP_URL,

  /* API Endpoints */
  API_URL: buildURL(MAIN_URL, "/api/v1"),
  STRIPE_URL: buildURL(MAIN_URL, "/api/v1/stripe"),
  AD_URL: buildURL(MAIN_URL, "/api/sda"),
  SEARCH_URL: buildURL(MAIN_URL, "/api/v1"),
  MERE_URL: buildURL(MAIN_URL, "/api/v1"),
  MUSIC_URL: buildURL(MAIN_URL, "/api/v1"),
  LIVE_URL: buildURL(MAIN_URL, "/api/v1"),
  EMBED_URL: buildURL(MAIN_URL, "/embed"),

  /* WebSockets */
  MERE_WS: WS_URL,
  CHAT_URL: MAIN_URL,
  CHAT_WS: WS_URL ? `${WS_URL}/ws/newchat/chat` : "",

  /* Media & Static */
  SRC_URL: buildURL(BANNERDROP_URL, "/static"),
  FILEDROP_URL: buildURL(BANNERDROP_URL, "/api/v1/filedrop"),
  CHATDROP_URL: buildURL(BANNERDROP_URL, "/api/v1/filedrop"),

  /* Mode Flags */
  isDev: MODE === "development" || MODE === "dev",
  isStaging: MODE === "staging",
  isProduction: MODE === "production",
  environment: MODE,
};

export default apiConfig;