import {
    loadContent,
    navigate,
    getCurrentAppLocation,
    hydrateAuthState
} from "./routes/index.js";
import {
    setState
} from "./state/state.js";
import {
    detectLanguage,
    setLanguage
} from "./i18n/i18n.js";
import {
    profileEnvironment,
    setEnvironment,
    getNetworkSpeed,
    determineUITier
} from "./utils/app/env.js";
import {
    trackError,
    showApplicationError,
    initGlobalErrorListeners
} from "./utils/app/errors.js";
import {
    setupPerformanceMonitoring,
    processPerformanceEntry,
    reportPerformanceIssue
} from "./utils/app/performance.js";
import {
    setupServiceWorker
} from "./utils/app/sw-register.js";
import {
    setupHistoryNavigation,
    setupGlobalNavigation
} from "./routes/navigation.js";

/* =========================================================
   CONSTANTS
========================================================= */

let offlineTimer = null;

/* =========================================================
   OFFLINE / ONLINE MONITORING
========================================================= */
function toggleOfflineBanner(isOffline) {
    const currentEnvironment = window.__env || {};
    const updatedEnvironment = { ...currentEnvironment, online: !isOffline };
    setEnvironment(updatedEnvironment);

    clearTimeout(offlineTimer);
    offlineTimer = setTimeout(() => {
        let banner = document.getElementById("offline-banner");
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


window.addEventListener("error", (event) => {
    trackError(event.error || new Error(event.message || "Unknown error"), {
        type: "uncaught_error",
        filename: event.filename,
        line: event.lineno,
        column: event.colno
    });
});

window.addEventListener("unhandledrejection", (event) => {
    trackError(event.reason || new Error("Unhandled promise rejection"), {
        type: "unhandled_rejection"
    });
});



/* =========================================================
   INITIAL APPLICATION STARTUP
========================================================= */
async function startApplication() {
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

        const initDeferredTasks = () => {
            setupPerformanceMonitoring();
        };

        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(initDeferredTasks, { timeout: 2000 });
        } else {
            setTimeout(initDeferredTasks, 200);
        }
    } catch (error) {
        trackError(error, { type: "init_failure" });
        showApplicationError();
    }
}

/* =========================================================
   STARTUP
========================================================= */
setupServiceWorker();

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => startApplication(), { once: true });
} else {
    startApplication();
}