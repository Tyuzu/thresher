import { loadContent, navigate } from "./routes/index.js";
import { setState } from "./state/state.js";
import { detectLanguage, setLanguage } from "./i18n/i18n.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("ServiceWorker registration successful with scope: ", registration.scope);
    } catch (error) {
      console.error("ServiceWorker registration failed: ", error);
    }
  });
}

// --- Environment Profiling ---
function profileEnvironment() {
  const ENV_CACHE_KEY = "env-profile-v1";
  const ENV_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);
  if (cachedEnv) {
    try {
      const parsed = JSON.parse(cachedEnv);
      if (Date.now() - parsed.ts < ENV_CACHE_TTL_MS) {
        setState({ environment: parsed.data });
        window.__env = parsed.data;
        return parsed.data;
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
    memory: navigator.deviceMemory || "unknown",
    uiTier
  };

  setState({ environment: envData });
  window.__env = envData;

  try {
    localStorage.setItem(ENV_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: envData }));
  } catch (e) {
    console.warn("⚠️ Cannot cache environment profile:", e.message);
  }

  return envData;
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
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        background: "#b00020",
        color: "#fff",
        textAlign: "center",
        padding: "0.5rem",
        zIndex: "9999",
        fontSize: "0.9rem",
        fontWeight: "600"
      });
      banner.textContent = "🔌 You're offline. Some features may not work.";
      document.body.appendChild(banner);
    } else if (banner) {
      banner.remove();
    }
  }, 300);
}

window.addEventListener("offline", () => toggleOfflineBanner(true));
window.addEventListener("online", () => toggleOfflineBanner(false));

// --- Global Error Tracking ---
const trackError = (error, context) => {
  console.error("🚨 Error Logged:", error, context);
  if (window.__errorTracker?.track) {
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
        // Exclude generic static asset requests
        if (entry.entryType === "resource" && /\.(png|jpe?g|gif|svg|webp|woff2?)$/i.test(entry.name)) {
          continue;
        }

        const threshold = entry.entryType === "longtask" ? 200 : 3000;

        if (entry.duration > threshold) {
          const details = { 
            name: entry.name, 
            entryType: entry.entryType, 
            duration: Math.round(entry.duration) 
          };
          
          console.warn(`🐢 Slow Performance Detected [${entry.entryType}]:`, details);
          if (window.__errorTracker?.trackMetric) {
            window.__errorTracker.trackMetric("performance_degradation", details);
          }
        }
      }
    });

    const typesToObserve = ["navigation", "longtask", "largest-contentful-paint"];

    for (const type of typesToObserve) {
      try {
        observer.observe({ type, buffered: true });
      } catch (_err) {
        // Ignore un-supported entry types in legacy browsers
      }
    }
  } catch (e) {
    console.warn("Performance monitoring unavailable:", e);
  }
}

// --- Global Navigation Event Interception ---
function setupGlobalNavigation() {
  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // External or special links
    if (
      href.startsWith("http://") || 
      href.startsWith("https://") || 
      href.startsWith("mailto:") || 
      href.startsWith("tel:") || 
      anchor.target === "_blank" ||
      e.ctrlKey || e.metaKey || e.shiftKey
    ) {
      return;
    }

    // Intercept SPA routes
    if (href.startsWith("/")) {
      e.preventDefault();
      navigate(href);
    }
  });
}

// --- Start App ---
window.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Language Setup
    const lang = detectLanguage();
    await setLanguage(lang);

    // 2. Immediate Environment Profiling
    profileEnvironment();

    // 3. Global SPA Navigation Delegator
    setupGlobalNavigation();

    // 4. Render Initial Route preserving full search and hash paths
    const initialUrl = window.location.pathname + window.location.search + window.location.hash;
    await loadContent(initialUrl || "/");

    // 5. Deferred Non-Critical Monitoring Tasks
    const initDeferredTasks = () => {
      setupPerformanceMonitoring();
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(initDeferredTasks);
    } else {
      setTimeout(initDeferredTasks, 200);
    }

    // 6. Router and History State Syncing
    window.addEventListener("popstate", async () => {
      if (!document.hidden) {
        const path = window.location.pathname + window.location.search + window.location.hash;
        await loadContent(path);
      }
    });

    window.addEventListener("pageshow", async (event) => {
      if (event.persisted) {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || null;
        setState({ token });
        const path = window.location.pathname + window.location.search + window.location.hash;
        await loadContent(path);
      }
    });

    if (!navigator.onLine) toggleOfflineBanner(true);

  } catch (error) {
    trackError(error, { type: "init_failure" });
    const errEl = document.createElement("div");
    Object.assign(errEl.style, { padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" });
    errEl.innerHTML = `<h1>⚠️ Application Error</h1><p>Unable to start the application. Please refresh.</p>`;
    document.body.replaceChildren(errEl);
  }
});