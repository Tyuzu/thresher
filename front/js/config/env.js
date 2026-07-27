/**
 * Environment Configuration
 * Vite + Netlify same-origin API configuration.
 *
 * Production:
 *   Frontend: https://your-site.com
 *   API:      /api/* → Netlify proxy → HTTP EC2
 *
 * Development:
 *   Set VITE_MAIN_URL / VITE_BANNERDROP_URL if the API
 *   is running on a separate origin.
 */

export const webSiteName = "Farmium";

/**
 * Vite environment variables.
 *
 * Production can leave these empty:
 *
 * VITE_MAIN_URL=
 * VITE_BANNERDROP_URL=
 *
 * This makes API URLs relative to the current website:
 *
 * /api/v1
 * /api/sda
 * /embed
 * /static
 */
const MAIN_URL = (import.meta.env.VITE_MAIN_URL || "").replace(/\/+$/, "");

const BANNERDROP_URL = (
  import.meta.env.VITE_BANNERDROP_URL || ""
).replace(/\/+$/, "");

const MODE = import.meta.env.MODE || "development";

/**
 * Build URLs safely.
 *
 * buildURL("", "/api/v1")
 *   => "/api/v1"
 *
 * buildURL("http://localhost:4000", "/api/v1")
 *   => "http://localhost:4000/api/v1"
 */
const buildURL = (baseURL, path) => {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return baseURL
    ? `${baseURL}${normalizedPath}`
    : normalizedPath;
};

/**
 * Build WebSocket base URL.
 *
 * Production with empty VITE_MAIN_URL:
 *
 * https://farmium.com
 *       ↓
 * wss://farmium.com
 *
 * Development:
 *
 * http://localhost:4000
 *       ↓
 * ws://localhost:4000
 */
const getWebSocketURL = () => {
  // Explicit API URL configured
  if (MAIN_URL) {
    const url = new URL(MAIN_URL);

    url.protocol =
      url.protocol === "https:"
        ? "wss:"
        : "ws:";

    return url.toString().replace(/\/+$/, "");
  }

  // Same-origin production URL
  if (typeof window !== "undefined") {
    const protocol =
      window.location.protocol === "https:"
        ? "wss:"
        : "ws:";

    return `${protocol}//${window.location.host}`;
  }

  return "";
};

const WS_URL = getWebSocketURL();

/**
 * Centralized API configuration.
 */
export const apiConfig = {
  /*
   * Base URLs
   */
  MAIN_URL,
  BANNERDROP_URL,

  /*
   * Main API
   *
   * Production:
   * /api/v1
   */
  API_URL: buildURL(
    MAIN_URL,
    "/api/v1"
  ),

  /*
   * Stripe
   */
  STRIPE_URL: buildURL(
    MAIN_URL,
    "/api/v1/stripe"
  ),

  /*
   * Advertisement / SDA
   */
  AD_URL: buildURL(
    MAIN_URL,
    "/api/sda"
  ),

  /*
   * Search
   */
  SEARCH_URL: buildURL(
    MAIN_URL,
    "/api/v1"
  ),

  /*
   * MERE
   */
  MERE_URL: buildURL(
    MAIN_URL,
    "/api/v1"
  ),

  /*
   * MERE WebSocket
   */
  MERE_WS: WS_URL,

  /*
   * Chat
   */
  CHAT_URL: MAIN_URL,

  /*
   * Chat WebSocket
   */
  CHAT_WS: `${WS_URL}/ws/newchat/chat`,

  /*
   * Music
   */
  MUSIC_URL: buildURL(
    MAIN_URL,
    "/api/v1"
  ),

  /*
   * Live
   */
  LIVE_URL: buildURL(
    MAIN_URL,
    "/api/v1"
  ),

  /*
   * Embed
   */
  EMBED_URL: buildURL(
    MAIN_URL,
    "/embed"
  ),

  /*
   * Static assets
   */
  SRC_URL: buildURL(
    BANNERDROP_URL,
    "/static"
  ),

  /*
   * Filedrop
   */
  FILEDROP_URL: buildURL(
    BANNERDROP_URL,
    "/api/v1/filedrop"
  ),

  /*
   * Chatdrop
   */
  CHATDROP_URL: buildURL(
    BANNERDROP_URL,
    "/api/v1/filedrop"
  ),

  /*
   * Runtime flags
   */
  isDev:
    MODE === "development" ||
    MODE === "dev",

  isStaging:
    MODE === "staging",

  isProduction:
    MODE === "production",

  environment: MODE,
};

export default apiConfig;