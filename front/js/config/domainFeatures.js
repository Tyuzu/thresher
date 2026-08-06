// src/config/domainFeatures.js

export const DOMAIN_FEATURE_MAP = {
  "farms.myapp.com": ["core", "farms", "chats"],
  "places.myapp.com": ["core", "places", "chats", "events", "baito"],
  "events.myapp.com": ["core", "events"],
  "baito.myapp.com": ["core", "baito", "chats", "places"],
  "chats.myapp.com": ["core", "chats"],
  "admin.myapp.com": ["core", "admin"],
  "social.myapp.com": ["core", "social", "chats"],

  // Local development, staging, and main hub access
  "localhost": ["ALL"],
  "127.0.0.1": ["ALL"],
  "myapp.com": ["ALL"]
};

/** Reverse lookup map linking feature keys back to their domain hostnames */
const FEATURE_TO_DOMAIN_MAP = {
  farms: "farms.myapp.com",
  places: "places.myapp.com",
  events: "events.myapp.com",
  baito: "baito.myapp.com",
  chats: "chats.myapp.com",
  admin: "admin.myapp.com",
  social: "social.myapp.com"
};

export const DOMAIN_METADATA = {
  "farms.myapp.com": {
    title: "FarmHub",
    description: "Discover local farms, fresh produce, and community crops.",
    theme: "theme-green",
    logo: "/logos/farm.svg",
    favicon: "/favicons/farm.ico"
  },
  "places.myapp.com": {
    title: "Places",
    description: "Explore local spots and community landmarks.",
    theme: "theme-emerald",
    logo: "/logos/places.svg",
    favicon: "/favicons/places.ico"
  },
  "events.myapp.com": {
    title: "EventPulse",
    description: "Find concerts, gatherings, and local experiences.",
    theme: "theme-purple",
    logo: "/logos/events.svg",
    favicon: "/favicons/events.ico"
  },
  "baito.myapp.com": {
    title: "BaitoJobs",
    description: "Part-time gigs, local hiring, and quick work.",
    theme: "theme-amber",
    logo: "/logos/baito.svg",
    favicon: "/favicons/baito.ico"
  },
  "chats.myapp.com": {
    title: "MereChat",
    description: "Connect and message directly with community members.",
    theme: "theme-blue",
    logo: "/logos/chats.svg",
    favicon: "/favicons/chats.ico"
  },
  "social.myapp.com": {
    title: "Community Posts",
    description: "Share updates, fan media, and community stories.",
    theme: "theme-pink",
    logo: "/logos/social.svg",
    favicon: "/favicons/social.ico"
  },
  "admin.myapp.com": {
    title: "System Admin",
    description: "Platform management and system controls.",
    theme: "theme-slate",
    logo: "/logos/admin.svg",
    favicon: "/favicons/admin.ico"
  },

  // Defaults for Local Development & Main Domain
  "localhost": {
    title: "Dev Suite",
    description: "Local development suite with full access.",
    theme: "theme-default",
    logo: "/logos/main.svg",
    favicon: "/favicon.ico"
  },
  "127.0.0.1": {
    title: "Dev Suite",
    description: "Local development suite with full access.",
    theme: "theme-default",
    logo: "/logos/main.svg",
    favicon: "/favicon.ico"
  },
  "myapp.com": {
    title: "Main Network",
    description: "All-in-one community hub.",
    theme: "theme-default",
    logo: "/logos/main.svg",
    favicon: "/favicon.ico"
  }
};

/**
 * Gets the feature override parameter from URL if present (`?feature=events`).
 */
function getUrlFeatureOverride() {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  const override = urlParams.get("feature");
  return override ? override.toLowerCase() : null;
}

/**
 * Returns allowed features for the current hostname or URL override.
 */
export function getCurrentAllowedFeatures() {
  const featureOverride = getUrlFeatureOverride();
  if (featureOverride) {
    return ["core", featureOverride];
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return DOMAIN_FEATURE_MAP[hostname] || ["ALL"];
}

/**
 * Checks if a specific feature key is allowed on the active domain.
 */
export function isFeatureAllowed(featureKey) {
  const allowed = getCurrentAllowedFeatures();
  if (allowed.includes("ALL")) return true;
  return allowed.includes(featureKey);
}

/**
 * Returns metadata object for current hostname or target URL override.
 */
export function getActiveDomainMetadata() {
  // 1. If testing via ?feature=events on localhost, dynamically switch branding metadata
  const featureOverride = getUrlFeatureOverride();
  if (featureOverride && FEATURE_TO_DOMAIN_MAP[featureOverride]) {
    const targetDomain = FEATURE_TO_DOMAIN_MAP[featureOverride];
    if (DOMAIN_METADATA[targetDomain]) {
      return DOMAIN_METADATA[targetDomain];
    }
  }

  // 2. Otherwise resolve by window hostname
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";

  return DOMAIN_METADATA[hostname] || DOMAIN_METADATA["localhost"] || {
    title: "App Network",
    description: "Community platform",
    theme: "theme-default",
    logo: "/logos/main.svg",
    favicon: "/favicon.ico"
  };
}