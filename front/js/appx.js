import { createRouter } from "./router/routes.js";
import { routes } from "./routes/routes.js";
import { setupPrefetching } from "./routes/prefetch.js";
import { setState, subscribe } from "./state/state.js";
import { detectLanguage, setLanguage } from "./i18n/i18n.js";
import { createheader } from "./components/layout/header.js";
import { createNav, highlightActiveNav } from "./components/layout/navigation.js";
import { Footer } from "./components/layout/footer.js";

// --- Layout Wrapper Registry ---
const layouts = {
  app: (rootContainer) => {
    // Render static layout frames dynamically around root content if present
    const header = document.getElementById("pageheader");
    const nav = document.getElementById("primary-nav");
    const footer = document.getElementById("pagefooter");

    if (header && !header.hasChildNodes()) header.replaceChildren(createheader());
    if (nav) {
      if (!nav.hasChildNodes()) nav.replaceChildren(createNav());
      nav.style.display = "";
      highlightActiveNav(window.location.pathname);
    }
    if (footer && !footer.hasChildNodes()) footer.replaceChildren(Footer());

    return rootContainer;
  },
  public: (rootContainer) => {
    // Hide navigation bar on public/standalone pages (e.g., Login/404)
    const nav = document.getElementById("primary-nav");
    if (nav) nav.style.display = "none";
    return rootContainer;
  }
};

// --- Instantiate Global Router ---
export let router;

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

  setState({ environment: envData });
  window.__env = envData;

  try {
    localStorage.setItem(ENV_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: envData }));
  } catch (e) {
    console.warn("⚠️ Cannot cache environment profile:", e.message);
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
        padding: "0.5rem", zIndex: "9999", fontSize: "0.9rem"
      });
      banner.textContent = "🔌 You're offline. Some features may not work.";
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
  console.error("🚨 Error Logged:", error, context);
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
      } catch (err) {
        // Entry type unsupported by browser
      }
    }
  } catch (e) {
    console.warn("Performance monitoring unavailable:", e);
  }
}

// --- App Bootstrap ---
window.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. i18n Initialization
    const lang = detectLanguage();
    await setLanguage(lang);

    // 2. Auth State Hydration
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    if (token) {
      let user = userRaw;
      if (userRaw && (userRaw.startsWith("{") || userRaw.startsWith("["))) {
        try { user = JSON.parse(userRaw); } catch (_) {}
      }
      setState({ token, user });
    }

    // 3. Router Initialization & Mount
    const rootEl = document.getElementById("content");
    router = createRouter({
      routes,
      mode: "history",
      layouts,
      rootEl
    });

    router.init();
    setupPrefetching(router);

    // 4. Deferred Tasks
    const initDeferredTasks = () => {
      profileEnvironment();
      setupPerformanceMonitoring();
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(initDeferredTasks);
    } else {
      setTimeout(initDeferredTasks, 200);
    }

    // 5. Post-Login Redirect Listener
    subscribe("token", (newToken) => {
      if (!newToken) return;
      const redirect = localStorage.getItem("redirectAfterLogin");
      if (redirect) {
        localStorage.removeItem("redirectAfterLogin");
        const target = redirect.startsWith("/") && !["/login", "/logout"].includes(redirect) 
          ? redirect 
          : "/home";
        router.navigate(target);
      }
    });

    // 6. BFCache / Tab Visibility Syncing
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        const activeToken = sessionStorage.getItem("token") || localStorage.getItem("token") || null;
        setState({ token: activeToken });
        router.navigate(window.location.pathname, {}, true);
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