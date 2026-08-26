import type { ErrorTracker } from "./errors.js";

/* =========================================================
   GLOBAL TYPE DECLARATIONS
========================================================= */
type PerformanceMetricDetails = Record<string, unknown> & {
  name: string;
  entryType: string;
  duration: number;
  threshold: number;
};

declare global {
  interface Window {
    __errorTracker?: ErrorTracker;
  }
}

/* =========================================================
   PERFORMANCE MONITORING
========================================================= */
export function setupPerformanceMonitoring(): void {
  if (!("PerformanceObserver" in window)) return;

  try {
    const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
    const types = ["navigation", "longtask", "largest-contentful-paint"];

    for (const type of types) {
      if (!supportedTypes.includes(type)) continue;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          processPerformanceEntry(entry);
        }
      });
      
      // type cast needed because observe options accept specific literal strings
      observer.observe({ type, buffered: true } as PerformanceObserverInit);
    }
  } catch (error: unknown) {
    console.warn("[PERF] Monitoring unavailable:", error);
  }
}

export function processPerformanceEntry(entry: PerformanceEntry): void {
  if (entry.entryType === "longtask" && entry.duration > 200) {
    reportPerformanceIssue(entry, 200);
    return;
  }
  if (entry.entryType === "largest-contentful-paint" && entry.startTime > 3000) {
    reportPerformanceIssue(entry, 3000);
    return;
  }
  if (entry.entryType === "navigation" && entry.duration > 3000) {
    reportPerformanceIssue(entry, 3000);
  }
}

export function reportPerformanceIssue(entry: PerformanceEntry, threshold: number): void {
  const details: PerformanceMetricDetails = {
    name: entry.name || "unknown",
    entryType: entry.entryType,
    duration: Math.round(entry.duration),
    threshold
  };

  console.warn(`[PERF] Slow ${entry.entryType}:`, details);

  if (window.__errorTracker?.trackMetric) {
    try {
      window.__errorTracker.trackMetric("performance_degradation", details as Record<string, unknown>);
    } catch (error: unknown) {
      console.warn("[PERF] Metric tracking failed:", error);
    }
  }
}