/**
 * Modern Performance Monitoring Utility
 * Tracks Core Web Vitals (FCP, LCP, CLS, INP), Navigation Timing, and Memory safely.
 */
class PerformanceMonitor {
  constructor(options = {}) {
    this.metrics = new Map();
    this.enabled = options.enabled ?? true;
    this.reportEndpoint = options.reportEndpoint || null;
    this.reportIntervalDuration = options.reportInterval || 60000;
    this.verbose = options.verbose ?? false;
    this.timerId = null; // Isolated interval handler state instance
    this.observers = [];

    // Advanced Vitals tracking buffer matrices
    this.clsSessionValue = 0;
    this.clsEntries = [];
  }

  mark(name) {
    if (!this.enabled) return;
    performance.mark(name);
  }

  measure(name, startMark, endMark) {
    if (!this.enabled) return;
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name).pop();
      if (measure) {
        this.recordMetric(name, measure.duration);
      }
    } catch (error) {
      console.warn("[PerfMonitor] Failed to measure:", error);
    }
  }

  recordMetric(name, value) {
    if (!this.enabled) return;
    this.metrics.set(name, Number(value));
    if (this.verbose) {
      console.log(`[PerfMonitor] Metric recorded -> ${name}:`, value);
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  async reportMetrics(isUnloading = false) {
    if (!this.enabled) return null;

    // Merge static navigation and contextual memory snapshots at the time of reporting
    const navTiming = this.getNavigationTiming();
    if (navTiming) this.metrics.set("navTiming", navTiming);

    const memInfo = this.getMemoryInfo();
    if (memInfo) this.metrics.set("memory", memInfo);

    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metrics: this.getMetrics(),
    });

    if (this.reportEndpoint) {
      try {
        // Safe context transmission fallback check logic on window disposal bounds
        if (isUnloading && typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon(this.reportEndpoint, payload);
        } else {
          await fetch(this.reportEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true, // Prevents tab close termination vectors
            signal: AbortSignal.timeout(5000),
          });
        }
      } catch (error) {
        console.warn("[PerfMonitor] Failed to transmit telemetry metrics:", error);
      }
    }

    return this.getMetrics();
  }

  observeWebVitals() {
    if (!this.enabled || typeof PerformanceObserver === "undefined") return;

    try {
      const bufferedOptions = { buffered: true };

      // 1. First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entry = entryList.getEntries().find((e) => e.name === "first-contentful-paint");
        if (entry) this.recordMetric("FCP", entry.startTime);
      });
      fcpObserver.observe({ type: "paint", ...bufferedOptions });
      this.observers.push(fcpObserver);

      // 2. Largest Contentful Paint (LCP) - Continually tracks latest candidate element
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric("LCP", lastEntry.startTime);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", ...bufferedOptions });
      this.observers.push(lcpObserver);

      // 3. Cumulative Layout Shift (CLS) - Standard Session Windowing Formula
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.hadRecentInput) continue;

          const firstSessionEntry = this.clsEntries[0];
          const lastSessionEntry = this.clsEntries[this.clsEntries.length - 1];

          // Session gaps check: 1s break between shifts or max 5s window duration limit
          if (
            this.clsEntries.length > 0 &&
            (entry.startTime - lastSessionEntry.startTime > 1000 ||
              entry.startTime - firstSessionEntry.startTime > 5000)
          ) {
            this.clsSessionValue = entry.value;
            this.clsEntries = [entry];
          } else {
            this.clsSessionValue += entry.value;
            this.clsEntries.push(entry);
          }

          const currentClsMetric = this.getMetric("CLS") || 0;
          if (this.clsSessionValue > currentClsMetric) {
            this.recordMetric("CLS", this.clsSessionValue);
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", ...bufferedOptions });
      this.observers.push(clsObserver);

      // 4. Interaction to Next Paint (INP) - Tracks responsiveness latency bounds
      const inpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.interactionId) {
            // Log highest duration target item observed on active frame cycles
            const currentInp = this.getMetric("INP") || 0;
            if (entry.duration > currentInp) {
              this.recordMetric("INP", entry.duration);
            }
          }
        }
      });
      inpObserver.observe({ type: "event", durationThreshold: 16, ...bufferedOptions });
      this.observers.push(inpObserver);
    } catch (error) {
      console.warn("[PerfMonitor] Failed to spin up Web Vitals pipelines:", error);
    }
  }

  getNavigationTiming() {
    try {
      const navEntry = performance.getEntriesByType("navigation")[0];
      if (!navEntry) return null;

      return {
        dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
        tcp: navEntry.connectEnd - navEntry.connectStart,
        ttfb: navEntry.responseStart - navEntry.requestStart,
        domLoad: navEntry.domComplete - navEntry.domContentLoadedEventEnd,
        resourceLoad: navEntry.loadEventEnd - navEntry.loadEventStart,
        total: navEntry.duration,
      };
    } catch (e) {
      return null;
    }
  }

  getMemoryInfo() {
    // Standard validation engine support boundary fallback assessment
    const mem = performance.memory || (navigator.deviceMemory ? { jsHeapSizeLimit: navigator.deviceMemory * 1024 * 1024 * 1024 } : null);
    if (!mem || !mem.usedJSHeapSize) return null;

    return {
      usedMemory: mem.usedJSHeapSize,
      totalMemory: mem.totalJSHeapSize,
      memoryLimit: mem.jsHeapSizeLimit,
      usagePercent: ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(2) + "%",
    };
  }

  clear() {
    this.metrics.clear();
    this.clsEntries = [];
    this.clsSessionValue = 0;
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      console.warn("[PerfMonitor] Reset operation error context:", error);
    }
  }

  startAutoReport() {
    if (!this.enabled || this.timerId) return;

    this.timerId = setInterval(
      () => this.reportMetrics(false),
      this.reportIntervalDuration
    );

    // Bind page hooks to catch early navigation exits cleanly
    this._unloadHandler = () => this.reportMetrics(true);
    window.addEventListener("pagehide", this._unloadHandler, { capture: true });
  }

  stopAutoReport() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this._unloadHandler) {
      window.removeEventListener("pagehide", this._unloadHandler, { capture: true });
      this._unloadHandler = null;
    }
  }

  disconnectObservers() {
    this.observers.forEach((obs) => obs.disconnect());
    this.observers = [];
  }
}

export { PerformanceMonitor };