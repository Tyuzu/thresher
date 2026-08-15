import {
  loadContent,
  navigate,
  getCurrentAppLocation,
  hydrateAuthState
} from "./routes/index.js";

import { setState } from "./state/state.js";
import { detectLanguage, setLanguage } from "./i18n/i18n.js";

/* =========================================================
   SERVICE WORKER
========================================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );

      console.log(
        "ServiceWorker registration successful with scope:",
        registration.scope
      );
    } catch (error) {
      console.error(
        "ServiceWorker registration failed:",
        error
      );
    }
  });
}

/* =========================================================
   ENVIRONMENT PROFILING
========================================================= */

function profileEnvironment() {
  const ENV_CACHE_KEY = "env-profile-v1";
  const ENV_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);

  if (cachedEnv) {
    try {
      const parsed = JSON.parse(cachedEnv);

      if (
        parsed?.ts &&
        Date.now() - parsed.ts < ENV_CACHE_TTL_MS
      ) {
        setState({
          environment: parsed.data
        });

        window.__env = parsed.data;

        return parsed.data;
      }
    } catch (_error) {
      localStorage.removeItem(ENV_CACHE_KEY);
    }
  }

  const isMobile = /Mobi|Android/i.test(
    navigator.userAgent
  );

  const networkSpeed =
    navigator.connection?.effectiveType || "unknown";

  let uiTier = localStorage.getItem("ui-tier-v1");

  if (!uiTier) {
    if (
      isMobile ||
      networkSpeed.includes("2g")
    ) {
      uiTier = "light";
    } else if (
      navigator.deviceMemory &&
      navigator.deviceMemory < 4
    ) {
      uiTier = "medium";
    } else {
      uiTier = "full";
    }

    localStorage.setItem(
      "ui-tier-v1",
      uiTier
    );
  }

  const envData = {
    deviceType: isMobile ? "mobile" : "desktop",
    networkSpeed,
    online: navigator.onLine,
    cores:
      navigator.hardwareConcurrency ||
      "unknown",
    memory:
      navigator.deviceMemory ||
      "unknown",
    uiTier
  };

  setState({
    environment: envData
  });

  window.__env = envData;

  try {
    localStorage.setItem(
      ENV_CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        data: envData
      })
    );
  } catch (error) {
    console.warn(
      "Cannot cache environment profile:",
      error?.message
    );
  }

  return envData;
}

/* =========================================================
   OFFLINE BANNER
========================================================= */

let offlineTimer = null;

function toggleOfflineBanner(isOffline) {
  clearTimeout(offlineTimer);

  offlineTimer = setTimeout(() => {
    let banner =
      document.getElementById(
        "offline-banner"
      );

    if (isOffline) {
      if (banner) return;

      banner =
        document.createElement("div");

      banner.id = "offline-banner";

      Object.assign(
        banner.style,
        {
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
        }
      );

      banner.textContent =
        "You are offline. Some features may not work.";

      document.body.appendChild(banner);
    } else if (banner) {
      banner.remove();
    }
  }, 300);
}

window.addEventListener(
  "offline",
  () => toggleOfflineBanner(true)
);

window.addEventListener(
  "online",
  () => toggleOfflineBanner(false)
);

/* =========================================================
   GLOBAL ERROR TRACKING
========================================================= */

const trackError = (error, context) => {
  console.error(
    "Application error:",
    error,
    context
  );

  if (
    window.__errorTracker?.track &&
    error
  ) {
    window.__errorTracker.track(
      error,
      context
    );
  }
};

window.addEventListener(
  "error",
  (event) => {
    trackError(
      event.error ||
      new Error(event.message || "Unknown error"),
      {
        type: "uncaught_error",
        message: event.message
      }
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    trackError(
      event.reason ||
      new Error("Unhandled promise rejection"),
      {
        type: "unhandled_rejection"
      }
    );
  }
);

/* =========================================================
   PERFORMANCE MONITORING
========================================================= */

function setupPerformanceMonitoring() {
  if (!window.PerformanceObserver) {
    return;
  }

  try {
    const observer =
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === "resource" &&
            /\.(png|jpe?g|gif|svg|webp|woff2?)$/i.test(
              entry.name
            )
          ) {
            continue;
          }

          const threshold =
            entry.entryType === "longtask"
              ? 200
              : 3000;

          if (entry.duration > threshold) {
            const details = {
              name: entry.name,
              entryType: entry.entryType,
              duration: Math.round(
                entry.duration
              )
            };

            console.warn(
              `Slow performance detected [${entry.entryType}]:`,
              details
            );

            if (
              window.__errorTracker
                ?.trackMetric
            ) {
              window.__errorTracker.trackMetric(
                "performance_degradation",
                details
              );
            }
          }
        }
      });

    const typesToObserve = [
      "navigation",
      "longtask",
      "largest-contentful-paint"
    ];

    for (const type of typesToObserve) {
      try {
        observer.observe({
          type,
          buffered: true
        });
      } catch (_error) {
        // Unsupported entry type.
      }
    }
  } catch (error) {
    console.warn(
      "Performance monitoring unavailable:",
      error
    );
  }
}

/* =========================================================
   GLOBAL SPA NAVIGATION
========================================================= */

function isModifiedClick(event) {
  return (
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function isSpecialLink(anchor) {
  const href =
    anchor.getAttribute("href");

  if (!href) return true;

  return (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:") ||
    href.startsWith("http://") ||
    href.startsWith("https://")
  );
}

function isSpaRoute(href) {
  return (
    href.startsWith("/") ||
    href.startsWith("#/")
  );
}

function setupGlobalNavigation() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      const anchor =
        target instanceof Element
          ? target.closest("a")
          : null;

      if (!anchor) return;

      if (isModifiedClick(event)) {
        return;
      }

      if (isSpecialLink(anchor)) {
        return;
      }

      const href =
        anchor.getAttribute("href");

      if (!href) return;

      // Ignore ordinary hash anchors such as #section
      if (
        href.startsWith("#") &&
        !href.startsWith("#/")
      ) {
        return;
      }

      if (!isSpaRoute(href)) {
        return;
      }

      event.preventDefault();

      navigate(href).catch((error) => {
        trackError(error, {
          type: "navigation_failure",
          path: href
        });
      });
    }
  );
}

/* =========================================================
   HISTORY / BACK / FORWARD
========================================================= */

function setupHistoryNavigation() {
  window.addEventListener(
    "popstate",
    async () => {
      try {
        await loadContent(
          getCurrentAppLocation()
        );
      } catch (error) {
        trackError(error, {
          type: "popstate_navigation_failure"
        });
      }
    }
  );

  /*
   * pushState() itself doesn't fire popstate when
   * this app changes the URL, so navigation() renders
   * explicitly. This listener is only for traversal.
   */

  window.addEventListener(
    "pageshow",
    async (event) => {
      if (!event.persisted) {
        return;
      }

      try {
        hydrateAuthState(true);
        await loadContent(
          getCurrentAppLocation()
        );
      } catch (error) {
        trackError(error, {
          type: "pageshow_navigation_failure"
        });
      }
    }
  );
}

/* =========================================================
   START APPLICATION
========================================================= */

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    try {
      if (
        "scrollRestoration" in history
      ) {
        history.scrollRestoration =
          "manual";
      }

      /* 1. Language */
      const lang = detectLanguage();
      await setLanguage(lang);

      /* 2. Auth hydration */
      hydrateAuthState(true);

      /* 3. Environment */
      profileEnvironment();

      /* 4. SPA navigation */
      setupGlobalNavigation();

      setupHistoryNavigation();

      /* 5. Initial render */
      const initialLocation =
        getCurrentAppLocation();

      await loadContent(
        initialLocation || "/"
      );

      /* 6. Deferred monitoring */
      const initDeferredTasks = () => {
        setupPerformanceMonitoring();
      };

      if (
        "requestIdleCallback" in window
      ) {
        window.requestIdleCallback(
          initDeferredTasks
        );
      } else {
        setTimeout(
          initDeferredTasks,
          200
        );
      }

      /* 7. Offline state */
      if (!navigator.onLine) {
        toggleOfflineBanner(true);
      }
    } catch (error) {
      trackError(error, {
        type: "init_failure"
      });

      const errEl =
        document.createElement("div");

      Object.assign(
        errEl.style,
        {
          padding: "2rem",
          textAlign: "center",
          fontFamily:
            "system-ui, sans-serif"
        }
      );

      errEl.innerHTML = `
        <h1>Application Error</h1>
        <p>
          Unable to start the application.
          Please refresh the page.
        </p>
      `;

      document.body.replaceChildren(
        errEl
      );
    }
  }
);