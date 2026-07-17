/**
 * Application Initialization Best Practices
 * Production-optimized error tracking, lifecycle diagnostics, and execution monitoring.
 */

import { errorTracker } from "../api/errorHandler.js";
import { PerformanceMonitor } from "../utils/performanceMonitor.js";
import { deferNonCritical } from "../utils/lazyLoad.js";

/**
 * Cleanly decodes JWT signatures supporting unicode payload sets safely
 */
function safeDecodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    
    // FIXED: Resolves malformed character bugs across broad multi-byte/unicode payload variations
    const binaryString = atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decodedText = new TextDecoder().decode(bytes);
    return JSON.parse(decodedText);
  } catch (err) {
    console.error("[Auth] Token extraction metadata failure:", err);
    return null;
  }
}

/**
 * Initialize error tracking
 */
export function initializeErrorTracking() {
  const token = localStorage.getItem("token");
  if (token) {
    const decoded = safeDecodeJWT(token);
    errorTracker.userId = decoded?.userId || decoded?.sub || "anonymous";
  } else {
    errorTracker.userId = "anonymous";
  }

  const isDev = window.location.hostname.includes("localhost");
  errorTracker.environment = isDev ? "development" : "production";

  window.addEventListener("error", (event) => {
    errorTracker.track(event.error || new Error(event.message), {
      type: "uncaught_error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    errorTracker.track(reason instanceof Error ? reason : new Error(String(reason)), {
      type: "unhandled_rejection",
      url: window.location.href
    });
  });
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
  const perfMonitor = new PerformanceMonitor({
    enabled: true,
    verbose: window.location.hostname.includes("localhost"),
    reportEndpoint: "/api/v1/metrics" 
  });

  perfMonitor.observeWebVitals();
  perfMonitor.mark("app-init-start");

  const finalizeMetrics = () => {
    perfMonitor.mark("app-init-end");
    perfMonitor.measure("app-init", "app-init-start", "app-init-end");

    deferNonCritical([
      () => perfMonitor.reportMetrics()
    ]);
  };

  // FIXED: Bypasses the race-condition where `load` fires before initialization scripts execute
  if (document.readyState === "complete") {
    finalizeMetrics();
  } else {
    window.addEventListener("load", finalizeMetrics, { once: true });
  }

  return perfMonitor;
}

/**
 * Initialize analytics tracking
 */
export function initializeAnalytics() {
  deferNonCritical([
    () => {
      if (window.location.hostname.includes("localhost")) {
        console.warn("[Analytics] Deferred initialization complete");
      }
      // Load third-party tags safely here
    }
  ]);
}

/**
 * Setup health checks with background performance optimizations
 */
export function setupHealthChecks() {
  let intervalId = null;

  const runCheck = async () => {
    // FIXED: Aborts execution loops if the page context shifts out of operational focus
    if (document.hidden) return;

    try {
      const response = await fetch("/api/v1/health", {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        errorTracker.track(new Error(`API Health failure: ${response.status}`), {
          context: "health_check",
          status: response.status
        });
      }
    } catch (error) {
      errorTracker.track(error, { context: "health_check_network_fault" });
    }
  };

  const startPolling = () => {
    if (!intervalId) {
      intervalId = setInterval(runCheck, 5 * 60 * 1000);
      runCheck(); // Initial execution invocation
    }
  };

  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Listens directly to the host application interface layer lifecycle context shifts
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopPolling() : startPolling();
  });

  startPolling();
}

/**
 * Full application bootstrap execution pipeline
 */
export async function initializeApp() {
  try {
    initializeErrorTracking();

    const perfMonitor = initializePerformanceMonitoring();

    initializeAnalytics();

    deferNonCritical([setupHealthChecks]);

    const isLocal = window.location.hostname.includes("localhost");

    if (isLocal) {
      console.warn("[App] Initialization complete");
      window.__APP_DEBUG = {
        perfMonitor,
        errorTracker,
        getMetrics: () => perfMonitor.getMetrics(),
        getErrors: () => errorTracker.getLog(),
        getNavigationTiming: () => perfMonitor.getNavigationTiming(),
        getMemoryInfo: () => perfMonitor.getMemoryInfo()
      };
      console.warn("[App] Debug tools available at window.__APP_DEBUG");
    }
  } catch (error) {
    console.error("[App] Initialization failed:", error);
    errorTracker.track(error, { context: "app_init" });
  }
}

export default {
  initializeErrorTracking,
  initializePerformanceMonitoring,
  initializeAnalytics,
  setupHealthChecks,
  initializeApp
};