
/* =========================================================
   PERFORMANCE MONITORING
========================================================= */
export function setupPerformanceMonitoring() {
    if (!window.PerformanceObserver) return;

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
            observer.observe({ type, buffered: true });
        }
    } catch (error) {
        console.warn("[PERF] Monitoring unavailable:", error);
    }
}

export function processPerformanceEntry(entry) {
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

export function reportPerformanceIssue(entry, threshold) {
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