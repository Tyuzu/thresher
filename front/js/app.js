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
/* =========================================================
   CONSTANTS
========================================================= */
const APP_VERSION = "v18";
const ENV_CACHE_KEY = "env-profile-v2";
const UI_TIER_KEY = "ui-tier-v2";
const ENV_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let offlineTimer = null;
let serviceWorkerRefreshing = false;
/* =========================================================
   SERVICE WORKER
========================================================= */
function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        console.warn("[SW] Service workers are not supported.");
        return;
    }
    /*
     * Register after the page has loaded so SW startup does
     * not compete unnecessarily with initial application work.
     */
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("/service-worker.js", {
                updateViaCache: "none"
            });
            console.log("[SW] Registered:", registration.scope);
            /*
             * Explicitly check for a newer worker.
             */
            try {
                await registration.update();
            } catch (error) {
                console.warn("[SW] Update check failed:", error);
            }
            /*
             * If a new worker is already waiting, ask it
             * to activate.
             */
            if (registration.waiting) {
                requestServiceWorkerActivation(registration.waiting);
            }
            /*
             * Watch for future updates.
             */
            registration.addEventListener("updatefound",
                () => {
                    const newWorker = registration.installing;
                    if (!newWorker) {
                        return;
                    }
                    newWorker.addEventListener("statechange",
                        () => {
                            if (newWorker.state === "installed") {
                                /*
                                 * If a controller already exists,
                                 * this is an application update.
                                 */
                                if (navigator.serviceWorker.controller) {
                                    console.log("[SW] New version available.");
                                    requestServiceWorkerActivation(newWorker);
                                }
                            }
                        });
                });
        } catch (error) {
            console.error("[SW] Registration failed:", error);
        }
    });
    /*
     * The new service worker has taken control.
     *
     * Reload exactly once to make sure the new application
     * shell/assets are used.
     */
    navigator.serviceWorker.addEventListener("controllerchange",
        () => {
            if (serviceWorkerRefreshing) {
                return;
            }
            serviceWorkerRefreshing = true;
            console.log("[SW] Controller changed. Reloading application.");
            window.location.reload();
        });
    /*
     * Messages sent by service-worker.js.
     */
    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
}

function requestServiceWorkerActivation(worker) {
    if (!worker) {
        return;
    }
    worker.postMessage({
        type: "SKIP_WAITING"
    });
}

function handleServiceWorkerMessage(event) {
    const data = event.data;
    if (!data?.type) {
        return;
    }
    switch (data.type) {
        case "SW_ACTIVATED":
            console.log("[SW] Active version:", data.version);
            break;
        case "SW_VERSION":
            console.log("[SW] Version:", data.version);
            break;
        default:
            break;
    }
}
/* =========================================================
   ENVIRONMENT PROFILING
========================================================= */
function profileEnvironment() {
    const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);
    /*
     * Use cached environment information when possible.
     * Connectivity is always refreshed because it can change
     * independently of the cached profile.
     */
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

function setEnvironment(envData) {
    setState({
        environment: envData
    });
    window.__env = envData;
}

function getNetworkSpeed() {
    return (navigator.connection?.effectiveType || "unknown");
}

function determineUITier(isMobile, networkSpeed) {
    const cachedTier = localStorage.getItem(UI_TIER_KEY);
    /*
     * Preserve an existing user/device decision.
     */
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
/* =========================================================
   OFFLINE / ONLINE MONITORING
========================================================= */
function toggleOfflineBanner(isOffline) {
    const currentEnvironment = window.__env || {};
    const updatedEnvironment = {
        ...currentEnvironment,
        online: !isOffline
    };
    setEnvironment(updatedEnvironment);
    clearTimeout(offlineTimer);
    offlineTimer = setTimeout(() => {
        let banner = document.getElementById("offline-banner");
        if (isOffline) {
            if (banner) {
                return;
            }
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
            /*
             * Avoid covering application content forever.
             * The banner remains until connectivity returns.
             */
        } else {
            if (!banner) {
                return;
            }
            /*
             * Change the message briefly so users know
             * connectivity actually returned.
             */
            banner.textContent = "Connection restored.";
            banner.style.background = "#137333";
            setTimeout(() => {
                banner?.remove();
            }, 1500);
        }
    }, 250);
}
window.addEventListener("offline",
    () => {
        toggleOfflineBanner(true);
    });
window.addEventListener("online",
    () => {
        toggleOfflineBanner(false);
    });
/* =========================================================
   GLOBAL ERROR TRACKING
========================================================= */
function trackError(error, context = {}) {
    const normalizedError = error instanceof Error ? error : new Error(String(error || "Unknown error"));
    console.error("[APP ERROR]", normalizedError, context);
    if (window.__errorTracker?.track) {
        try {
            window.__errorTracker.track(normalizedError, context);
        } catch (trackingError) {
            console.warn("[ERROR TRACKER] Failed:", trackingError);
        }
    }
}
window.addEventListener("error",
    (event) => {
        trackError(event.error || new Error(event.message || "Unknown error"), {
            type: "uncaught_error",
            filename: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });
window.addEventListener("unhandledrejection",
    (event) => {
        trackError(event.reason || new Error("Unhandled promise rejection"), {
            type: "unhandled_rejection"
        });
    });
/* =========================================================
   PERFORMANCE MONITORING
========================================================= */
function setupPerformanceMonitoring() {
    if (!window.PerformanceObserver) {
        return;
    }
    try {
        const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
        /*
         * Use separate observers for supported
         * performance entry types.
         *
         * This avoids asking the browser to observe
         * unsupported types.
         */
        const types = ["navigation", "longtask", "largest-contentful-paint"];
        for (const type of types) {
            if (!supportedTypes.includes(type)) {
                continue;
            }
            const observer = new PerformanceObserver(
                (list) => {
                    for (const entry of list.getEntries()) {
                        processPerformanceEntry(entry);
                    }
                });
            observer.observe({
                type,
                buffered: true
            });
        }
    } catch (error) {
        console.warn("[PERF] Monitoring unavailable:", error);
    }
}

function processPerformanceEntry(entry) {
    /*
     * Long tasks above 200ms are meaningful.
     */
    if (entry.entryType === "longtask") {
        if (entry.duration <= 200) {
            return;
        }
        reportPerformanceIssue(entry, 200);
        return;
    }
    /*
     * LCP above 3 seconds deserves attention.
     */
    if (entry.entryType === "largest-contentful-paint") {
        if (entry.startTime <= 3000) {
            return;
        }
        reportPerformanceIssue(entry, 3000);
        return;
    }
    /*
     * Navigation above 3 seconds.
     */
    if (entry.entryType === "navigation") {
        if (entry.duration <= 3000) {
            return;
        }
        reportPerformanceIssue(entry, 3000);
    }
}

function reportPerformanceIssue(entry, threshold) {
    const details = {
        name: entry.name || "unknown",
        entryType: entry.entryType,
        duration: Math.round(entry.duration),
        threshold
    };
    console.warn(`[PERF] Slow ${entry.entryType}:`, details);
    if (window.__errorTracker?.trackMetric) {
        try {
            window.__errorTracker.trackMetric("performance_degradation", details);
        } catch (error) {
            console.warn("[PERF] Metric tracking failed:", error);
        }
    }
}
/* =========================================================
   GLOBAL SPA NAVIGATION
========================================================= */
function isModifiedClick(event) {
    return (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0);
}

function isSpecialLink(anchor) {
    const href = anchor.getAttribute("href");
    if (!href) {
        return true;
    }
    /*
     * Browser-native navigation should remain browser-native.
     */
    if (anchor.target === "_blank" || anchor.hasAttribute("download") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
        return true;
    }
    /*
     * Do not hijack external links.
     */
    try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
            return true;
        }
    } catch {
        return true;
    }
    return false;
}

function isSpaRoute(href) {
    if (!href) {
        return false;
    }
    /*
     * Absolute same-origin paths.
     */
    if (href.startsWith("/")) {
        return true;
    }
    /*
     * Hash-based SPA routes.
     */
    if (href.startsWith("#/")) {
        return true;
    }
    return false;
}

function setupGlobalNavigation() {
    document.addEventListener("click",
        (event) => {
            const target = event.target;
            const anchor = target instanceof
            Element ? target.closest("a") : null;
            if (!anchor) {
                return;
            }
            if (isModifiedClick(event)) {
                return;
            }
            if (isSpecialLink(anchor)) {
                return;
            }
            const href = anchor.getAttribute("href");
            if (!href) {
                return;
            }
            /*
             * Normal page anchors such as:
             *
             * #features
             * #pricing
             *
             * remain native browser behavior.
             */
            if (href.startsWith("#") && !href.startsWith("#/")) {
                return;
            }
            if (!isSpaRoute(href)) {
                return;
            }
            event.preventDefault();
            navigate(href).catch(
                (error) => {
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
function setupHistoryNavigation() {
    window.addEventListener("popstate", async () => {
        try {
            await loadContent(getCurrentAppLocation());
            focusMainContent();
        } catch (error) {
            trackError(error, {
                type: "popstate_navigation_failure"
            });
        }
    });
    /*
     * pageshow fires when returning from browser
     * back-forward cache.
     */
    window.addEventListener("pageshow", async (event) => {
        if (!event.persisted) {
            return;
        }
        try {
            hydrateAuthState(true);
            await loadContent(getCurrentAppLocation());
            focusMainContent();
        } catch (error) {
            trackError(error, {
                type: "pageshow_navigation_failure"
            });
        }
    });
}
/* =========================================================
   ACCESSIBILITY
========================================================= */
function focusMainContent() {
    const content = document.getElementById("content");
    if (!content) {
        return;
    }
    /*
     * Prevent the focus operation from creating
     * an unwanted browser scroll when possible.
     */
    try {
        content.focus({
            preventScroll: true
        });
    } catch {
        content.focus();
    }
}
/* =========================================================
   INITIAL APPLICATION STARTUP
========================================================= */
async function startApplication() {
    try {
        /*
         * Let the browser manage restoration when appropriate.
         * We handle SPA route changes ourselves.
         */
        if ("scrollRestoration" in history) {
            history.scrollRestoration = "manual";
        }
        /*
         * 1. Language
         */
        const lang = detectLanguage();
        await setLanguage(lang);
        /*
         * 2. Authentication
         */
        hydrateAuthState(true);
        /*
         * 3. Environment
         */
        profileEnvironment();
        /*
         * 4. Navigation
         */
        setupGlobalNavigation();
        setupHistoryNavigation();
        /*
         * 5. Initial route
         */
        const initialLocation = getCurrentAppLocation();
        await loadContent(initialLocation || "/");
        /*
         * 6. Initial connectivity state
         */
        if (!navigator.onLine) {
            toggleOfflineBanner(true);
        }
        /*
         * 7. Deferred performance monitoring
         */
        const initDeferredTasks = () => {
            setupPerformanceMonitoring();
        };
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(initDeferredTasks, {
                timeout: 2000
            });
        } else {
            setTimeout(initDeferredTasks, 200);
        }
    } catch (error) {
        trackError(error, {
            type: "init_failure"
        });
        showApplicationError();
    }
}
/* =========================================================
   APPLICATION ERROR UI
========================================================= */
function showApplicationError() {
    const container = document.createElement("div");
    Object.assign(container.style, {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center"
    });
    container.innerHTML = `
        <main>
            <h1>Farmium couldn't start</h1>
            <p>
                Something went wrong while loading the
                application. Please refresh the page.
            </p>
            <button
                type="button"
                id="app-reload-button"
                style="
                    padding:0.7rem 1.2rem;
                    border:0;
                    border-radius:6px;
                    cursor:pointer;
                "
            >
                Refresh Farmium
            </button>
        </main>
    `;
    document.body.replaceChildren(container);
    document.getElementById("app-reload-button")?.addEventListener("click",
        () => {
            window.location.reload();
        });
}
/* =========================================================
   STARTUP
========================================================= */
/*
 * Service worker registration is intentionally independent
 * of application startup.
 */
setupServiceWorker();
window.addEventListener("DOMContentLoaded",
    () => {
        startApplication();
    }, {
        once: true
    });