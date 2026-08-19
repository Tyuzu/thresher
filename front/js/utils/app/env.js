import { setState } from "../../state/state.js";
import { ENV_CACHE_KEY, UI_TIER_KEY, ENV_CACHE_TTL_MS } from "../../config/appConstants.js";

/* =========================================================
   ENVIRONMENT PROFILING
========================================================= */
export function profileEnvironment() {
    const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);

    if (cachedEnv) {
        try {
            const parsed = JSON.parse(cachedEnv);
            if (parsed?.ts && parsed?.data && Date.now() - parsed.ts < ENV_CACHE_TTL_MS) {
                const envData = {
                    ...parsed.data,
                    online: navigator.onLine,
                    networkSpeed: getNetworkSpeed()
                };
                setEnvironment(envData);
                return envData;
            }
        } catch (error) {
            console.warn("[ENV] Invalid cached profile:", error);
            localStorage.removeItem(ENV_CACHE_KEY);
        }
    }

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const networkSpeed = getNetworkSpeed();
    const uiTier = determineUITier(isMobile, networkSpeed);
    const envData = {
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
        localStorage.setItem(ENV_CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            data: envData
        }));
    } catch (error) {
        console.warn("[ENV] Unable to cache profile:", error?.message);
    }
    return envData;
}

export function setEnvironment(envData) {
    setState({ environment: envData });
    window.__env = envData;
}

export function getNetworkSpeed() {
    return navigator.connection?.effectiveType || "unknown";
}

export function determineUITier(isMobile, networkSpeed) {
    const cachedTier = localStorage.getItem(UI_TIER_KEY);
    if (cachedTier === "light" || cachedTier === "medium" || cachedTier === "full") {
        return cachedTier;
    }

    let tier = "full";
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
