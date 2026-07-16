import { loadContent } from "./routes/index.js";
import { setState } from "./state/state.js";
import { detectLanguage, setLanguage } from "./i18n/i18n.js";

// --- Environment Profiling (Lightweight & Non-blocking) ---
function profileEnvironment() {
  const ENV_CACHE_KEY = "env-profile-v1";
  const ENV_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);
  if (cachedEnv) {
    try {
      const parsed = JSON.parse(cachedEnv);
      if (Date.now() - parsed.ts < ENV_CACHE_TTL_MS) {
        setState("environment", parsed.data);
        window.__env = parsed.data;
        return;
      }
    } catch (_e) {
      localStorage.removeItem(ENV_CACHE_KEY);
    }
  }

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const networkSpeed = navigator.connection?.effectiveType || "unknown";
  
  let uiTier = localStorage.getItem("ui-tier-v1");
  if (!uiTier) {
    if (isMobile || networkSpeed.includes("2g")) {
      uiTier = "light";
    } else if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      uiTier = "medium";
    } else {
      uiTier = "full";
    }
    localStorage.setItem("ui-tier-v1", uiTier);
  }

  const envData = {
    deviceType: isMobile ? "mobile" : "desktop",
    networkSpeed,
    online: navigator.onLine,
    cores: navigator.hardwareConcurrency || "unknown",
    memory: navigator.deviceMemory || "unknown"
  };

  setState("environment", envData);
  window.__env = envData;

  try {
    localStorage.setItem(ENV_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: envData }));
  } catch (e) {
    console.warn("âš ï¸ Cannot cache environment profile:", e.message);
  }
}

// --- Offline Banner ---
let offlineTimer = null;
function toggleOfflineBanner(isOffline) {
  clearTimeout(offlineTimer);
  offlineTimer = setTimeout(() => {
    let banner = document.getElementById("offline-banner");
    if (isOffline) {
      if (banner) return;
      banner = document.createElement("div");
      banner.id = "offline-banner";
      Object.assign(banner.style, {
        position: "fixed", top: "0", left: "0", right: "0",
        background: "#b00020", color: "#fff", textAlign: "center",
        padding: "0.5rem", zIndex: "9999", fontSize: "0.9rem",
      });
      banner.textContent = "ðŸ“´ You're offline. Some features may not work.";
      document.body.appendChild(banner);
    } else if (banner) {
      banner.remove();
    }
  }, 1000);
}

window.addEventListener("offline", () => toggleOfflineBanner(true));
window.addEventListener("online", () => toggleOfflineBanner(false));

// --- Global Error Tracking ---
const trackError = (error, context) => {
  console.error("ðŸš¨", error, context);
  if (window.__errorTracker) {
    window.__errorTracker.track(error, context);
  }
};

window.addEventListener("error", (e) => trackError(e.error, { type: "uncaught_error", message: e.message }));
window.addEventListener("unhandledrejection", (e) => trackError(e.reason, { type: "unhandled_rejection" }));

// --- Performance Monitoring ---
function setupPerformanceMonitoring() {
  if (!window.PerformanceObserver) return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 3000) {
          const details = { name: entry.name, entryType: entry.entryType, duration: Math.round(entry.duration) };
          trackError(new Error("Performance degradation"), Object.assign({ type: "slow_operation" }, details));
        }
      }
    });

    // FIX: Observe entry types separately to safely use the buffered flag
    const typesToObserve = ["navigation", "resource", "paint", "largest-contentful-paint"];
    
    for (const type of typesToObserve) {
      try {
        observer.observe({ type, buffered: true });
      } catch (err) {
        // Fallback for browsers that don't support specific entry types
        console.warn(`Performance type "${type}" not supported:`, err.message);
      }
    }
  } catch (e) {
    console.warn("Performance monitoring unavailable:", e);
  }
}

// --- Start App ---
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const lang = detectLanguage();
    await setLanguage(lang);
    await loadContent(window.location.pathname);

    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        profileEnvironment();
        setupPerformanceMonitoring();
      });
    } else {
      setTimeout(() => {
        profileEnvironment();
        setupPerformanceMonitoring();
      }, 1);
    }

    window.addEventListener("popstate", async () => {
      if (!document.hidden) await loadContent(window.location.pathname);
    });

    window.addEventListener("pageshow", async (event) => {
      if (event.persisted) {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || null;
        setState("token", token);
        await loadContent(window.location.pathname);
      }
    });

    if (!navigator.onLine) toggleOfflineBanner(true);

  } catch (error) {
    trackError(error, { type: "init_failure" });
    const errEl = document.createElement("div");
    Object.assign(errEl.style, { padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" });
    errEl.innerHTML = `<h1> Application Error</h1><p>Unable to start the application. Please refresh.</p>`;
    document.body.replaceChildren(errEl);
  }
});