/**
 * Environment Configuration
 * Powered natively by Vite env variables.
 */

export const webSiteName = "Farmium";

// Grab variables injected by the bundler, with local fallbacks if undefined
const MAIN_URL = import.meta.env.VITE_MAIN_URL || "https://localhost:4000";
const BANNERDROP_URL = import.meta.env.VITE_BANNERDROP_URL || "https://localhost:4000";

const MODE = import.meta.env.MODE || "development";

// Derive WebSocket protocols accurately without regex overhead
const WS_PROTOCOL = MAIN_URL.startsWith("https") ? "wss" : "ws";
const CLEAN_HOST = MAIN_URL.replace(/^https?:\/\//, "");

/**
 * Build all API URLs from centralized config elements
 */
export const apiConfig = {
  MAIN_URL,
  BANNERDROP_URL,

  API_URL: `${MAIN_URL}/api/v1`,
  STRIPE_URL: `${MAIN_URL}/api/v1/stripe`,
  AD_URL: `${MAIN_URL}/api/sda`,
  SEARCH_URL: `${MAIN_URL}/api/v1`,
  MERE_URL: `${MAIN_URL}/api/v1`,
  MERE_WS: MAIN_URL,
  CHAT_URL: MAIN_URL,
  
  // Safe, fast URL generation without relying on string mutation manipulation
  CHAT_WS: `${WS_PROTOCOL}://${CLEAN_HOST}/ws/newchat/chat`,
  
  MUSIC_URL: `${MAIN_URL}/api/v1`,
  LIVE_URL: `${MAIN_URL}/api/v1`,
  EMBED_URL: `${MAIN_URL}/embed`,
  SRC_URL: `${BANNERDROP_URL}/static`,
  FILEDROP_URL: `${BANNERDROP_URL}/api/v1/filedrop`,
  CHATDROP_URL: `${BANNERDROP_URL}/api/v1/filedrop`,

  // Runtime flags
  isDev: MODE === "development" || MODE === "dev",
  isStaging: MODE === "staging",
  isProduction: MODE === "production",
  environment: MODE,
};

export default apiConfig;