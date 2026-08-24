import { setState } from "../../state/state.js";
import { ENV_CACHE_KEY, UI_TIER_KEY, ENV_CACHE_TTL_MS } from "../../config/appConstants.js";

/* =========================================================
   TYPES & EXTENSIONS
========================================================= */
export type UITier = "light" | "medium" | "full";
export type DeviceType = "mobile" | "desktop";

export interface NetworkInformation {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | string;
  saveData?: boolean;
}

export interface EnvironmentData {
  deviceType: DeviceType;
  networkSpeed: string;
  online: boolean;
  cores: number | "unknown";
  memory: number | "unknown";
  uiTier: UITier;
  serviceWorker: boolean;
  touch: boolean;
}

interface CachedEnvironment {
  ts: number;
  data: Omit<EnvironmentData, "online" | "networkSpeed">;
}

/* Extend standard Navigator for non-standard APIs */
declare global {
  interface Navigator {
    connection?: NetworkInformation;
    deviceMemory?: number;
  }

  interface Window {
    __env?: EnvironmentData;
  }
}

/* =========================================================
   ENVIRONMENT PROFILING
========================================================= */
export function profileEnvironment(): EnvironmentData {
  const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);

  if (cachedEnv) {
    try {
      const parsed: CachedEnvironment = JSON.parse(cachedEnv);
      if (parsed?.ts && parsed?.data && Date.now() - parsed.ts < ENV_CACHE_TTL_MS) {
        const envData: EnvironmentData = {
          ...parsed.data,
          online: navigator.onLine,
          networkSpeed: getNetworkSpeed()
        };
        setEnvironment(envData);
        return envData;
      }
    } catch (error: unknown) {
      console.warn("[ENV] Invalid cached profile:", error);
      localStorage.removeItem(ENV_CACHE_KEY);
    }
  }

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const networkSpeed = getNetworkSpeed();
  const uiTier = determineUITier(isMobile, networkSpeed);

  const envData: EnvironmentData = {
    deviceType: isMobile ? "mobile" : "desktop",
    networkSpeed,
    online: navigator.onLine,
    cores: navigator.hardwareConcurrency || "unknown",
    memory: navigator.deviceMemory || "unknown",
    uiTier,
    serviceWorker: "serviceWorker" in navigator,
    touch: "ontouchstart" in window || navigator.maxTouchPoints > 0
  };

  setEnvironment(envData);

  try {
    localStorage.setItem(
      ENV_CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        data: envData
      })
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[ENV] Unable to cache profile:", message);
  }

  return envData;
}

export function setEnvironment(envData: EnvironmentData): void {
  setState({ environment: envData });
  window.__env = envData;
}

export function getNetworkSpeed(): string {
  return navigator.connection?.effectiveType || "unknown";
}

export function determineUITier(isMobile: boolean, networkSpeed: string): UITier {
  const cachedTier = localStorage.getItem(UI_TIER_KEY);
  if (cachedTier === "light" || cachedTier === "medium" || cachedTier === "full") {
    return cachedTier;
  }

  let tier: UITier = "full";
  if (isMobile || networkSpeed === "slow-2g" || networkSpeed === "2g") {
    tier = "light";
  } else if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    tier = "medium";
  }

  try {
    localStorage.setItem(UI_TIER_KEY, tier);
  } catch {
    // localStorage is optional.
  }

  return tier;
}