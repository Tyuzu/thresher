import { loadContent, getCurrentAppLocation, hydrateAuthState } from "./routes/index.js";
import { detectLanguage, setLanguage } from "./i18n/i18n.js";
import { profileEnvironment, setEnvironment, EnvironmentData } from "./utils/app/env.js";
import { trackError, showApplicationError } from "./utils/app/errors.js";
import { setupPerformanceMonitoring } from "./utils/app/performance.js";
//import { setupServiceWorker } from "./utils/app/sw-register.js";
import { navigate } from "./routes/navigate.js";

/* =========================================================
   ACCESSIBILITY
========================================================= */
function focusMainContent(): void {
  const content = document.getElementById("content");
  if (!content) return;

  if (!content.hasAttribute("tabindex")) {
    content.setAttribute("tabindex", "-1");
  }

  try {
    content.focus({ preventScroll: true });
  } catch {
    content.focus();
  }
}

/* =========================================================
   GLOBAL SPA NAVIGATION
========================================================= */
export function isModifiedClick(event: MouseEvent): boolean {
  return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function isSpecialLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href) return true;

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return true;
  }

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return true;
  } catch {
    return true;
  }
  return false;
}

export function isSpaRoute(href: string | null): boolean {
  if (!href) return false;
  return href.startsWith("/") || href.startsWith("#/");
}

export function setupGlobalNavigation(): void {
  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    const anchor = target instanceof Element ? target.closest("a") : null;
    if (!anchor) return;

    if (isModifiedClick(event)) return;
    if (isSpecialLink(anchor)) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    if (href.startsWith("#") && !href.startsWith("#/")) return;
    if (!isSpaRoute(href)) return;

    event.preventDefault();
    navigate(href).catch((error: unknown) => {
      trackError(error, {
        type: "navigation_failure",
        path: href
      });
    });
  });
}

/* =========================================================
   HISTORY / BACK / FORWARD
========================================================= */
export function setupHistoryNavigation(): void {
  window.addEventListener("popstate", async () => {
    try {
      await loadContent(getCurrentAppLocation());
      focusMainContent();
    } catch (error: unknown) {
      trackError(error, { type: "popstate_navigation_failure" });
    }
  });

  window.addEventListener("pageshow", async (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    try {
      hydrateAuthState(true);
      await loadContent(getCurrentAppLocation());
      focusMainContent();
    } catch (error: unknown) {
      trackError(error, { type: "pageshow_navigation_failure" });
    }
  });
}

/* =========================================================
   TYPES & EXTENSIONS
========================================================= */

declare global {
  interface Window {
    __env?: EnvironmentData;
  }
}

/* =========================================================
   CONSTANTS
========================================================= */

let offlineTimer: ReturnType<typeof setTimeout> | null = null;

/* =========================================================
   OFFLINE / ONLINE MONITORING
========================================================= */

function toggleOfflineBanner(isOffline: boolean): void {
  // Use existing __env or fall back to profileEnvironment to ensure full EnvironmentData
  const currentEnv = window.__env || profileEnvironment();
  const updatedEnvironment: EnvironmentData = {
    ...currentEnv,
    online: !isOffline
  };
  setEnvironment(updatedEnvironment);

  if (offlineTimer !== null) {
    clearTimeout(offlineTimer);
  }

  offlineTimer = setTimeout(() => {
    let banner = document.getElementById("offline-banner") as HTMLElement | null;

    if (isOffline) {
      if (banner) return;

      banner = document.createElement("div");
      banner.id = "offline-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.setAttribute("data-offline", "true");

      Object.assign(banner.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        background: "#b00020",
        color: "#fff",
        textAlign: "center",
        padding: "0.6rem 1rem",
        zIndex: "9999",
        fontSize: "0.9rem",
        fontWeight: "600",
        boxSizing: "border-box"
      });

      banner.textContent = "You are offline. Some features may not be available.";
      document.body.appendChild(banner);
    } else {
      if (!banner) return;

      banner.textContent = "Connection restored.";
      banner.style.background = "#137333";

      const targetBanner = banner;
      setTimeout(() => {
        targetBanner?.remove();
      }, 1500);
    }
  }, 250);
}

window.addEventListener("offline", () => toggleOfflineBanner(true));
window.addEventListener("online", () => toggleOfflineBanner(false));

/* =========================================================
   GLOBAL ERROR TRACKING
========================================================= */

window.addEventListener("error", (event: ErrorEvent) => {
  trackError((event.error as Error) || new Error(event.message || "Unknown error"), {
    type: "uncaught_error",
    filename: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  trackError((event.reason as Error) || new Error("Unhandled promise rejection"), {
    type: "unhandled_rejection"
  });
});

/* =========================================================
   INITIAL APPLICATION STARTUP
========================================================= */

async function startApplication(): Promise<void> {
  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const lang = detectLanguage();
    await setLanguage(lang);

    hydrateAuthState(true);
    profileEnvironment();

    setupGlobalNavigation();
    setupHistoryNavigation();

    const initialLocation = getCurrentAppLocation();
    await loadContent(initialLocation || "/");

    if (!navigator.onLine) {
      toggleOfflineBanner(true);
    }

    const initDeferredTasks = (): void => {
      setupPerformanceMonitoring();
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(initDeferredTasks, { timeout: 2000 });
    } else {
      setTimeout(initDeferredTasks, 200);
    }
  } catch (error) {
    trackError(error as Error, { type: "init_failure" });
    showApplicationError();
  }
}

/* =========================================================
   STARTUP
========================================================= */
// setupServiceWorker();

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => startApplication(), { once: true });
} else {
  startApplication();
}