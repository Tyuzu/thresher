// src/utils/perfMonitor.js
import { track } from "./metrics.js"; // Standardized import

const REPORTING_INTERVAL = 30000; // 30 seconds
const MAX_SAMPLE_BUFFER = 1000;

// Internal Buffers
let fpsSamples = [];
let latencySamples = [];
let lastFrameTime = performance.now();
let frameCount = 0;
let animationFrameId = null;
let isMonitoring = false;

// --- 1. FPS Monitoring (Background-Aware) ---
function monitorFPS() {
  const now = performance.now();
  frameCount++;

  const delta = now - lastFrameTime;

  if (delta >= 1000) {
    // Only capture FPS if tab was active (ignore huge deltas from hidden tabs)
    if (document.visibilityState === "visible" && delta < 2000) {
      const fps = Math.round((frameCount * 1000) / delta);
      if (fpsSamples.length < MAX_SAMPLE_BUFFER) {
        fpsSamples.push(fps);
      }
    }
    frameCount = 0;
    lastFrameTime = now;
  }

  if (isMonitoring) {
    animationFrameId = requestAnimationFrame(monitorFPS);
  }
}

// --- 2. Input Latency & Core Web Vitals (INP, LCP, CLS) ---
let clsScore = 0;
let lcpMetric = null;

function monitorWebVitalsAndLatency() {
  if (typeof PerformanceObserver === "undefined") return;

  // Track INP / Event Timing
  try {
    const eventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId && entry.duration > 0) {
          if (latencySamples.length < MAX_SAMPLE_BUFFER) {
            latencySamples.push(Math.round(entry.duration));
          }
        }
      }
    });
    // Record interactions over 40ms
    eventObserver.observe({ type: "event", durationThreshold: 40, buffered: true });
  } catch (_) {
    // Fallback for older browsers without durationThreshold support
  }

  // Track CLS (Cumulative Layout Shift)
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch (_) {}

  // Track LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        lcpMetric = Math.round(lastEntry.startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (_) {}
}

// --- 3. Memory Monitoring (Safe) ---
function getMemoryStats() {
  if (typeof performance !== "undefined" && performance.memory) {
    const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
    return {
      usedMB: Math.round(usedJSHeapSize / 1048576),
      totalMB: Math.round(totalJSHeapSize / 1048576),
    };
  }
  return null;
}

// --- 4. Metric Aggregation & Reporting ---
function flushPerformanceMetrics() {
  // 1. Process FPS Summary
  if (fpsSamples.length > 0) {
    const total = fpsSamples.reduce((a, b) => a + b, 0);
    track("perf_fps_summary", {
      avg: Math.round(total / fpsSamples.length),
      min: Math.min(...fpsSamples),
      max: Math.max(...fpsSamples),
      samples: fpsSamples.length,
    });
    fpsSamples = [];
  }

  // 2. Process Input Latency Summary (INP)
  if (latencySamples.length > 0) {
    const total = latencySamples.reduce((a, b) => a + b, 0);
    const sorted = [...latencySamples].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    track("perf_latency_summary", {
      avg: Math.round(total / latencySamples.length),
      p95: sorted[p95Index] || sorted[sorted.length - 1],
      max: sorted[sorted.length - 1],
      samples: latencySamples.length,
    });
    latencySamples = [];
  }

  // 3. Process Web Vitals & Memory
  const mem = getMemoryStats();
  if (mem || clsScore > 0 || lcpMetric !== null) {
    track("perf_vitals_summary", {
      ...(mem && { memory: mem }),
      ...(clsScore > 0 && { cls: Number(clsScore.toFixed(4)) }),
      ...(lcpMetric !== null && { lcp_ms: lcpMetric }),
    });
  }
}

// --- 5. Lifecycle Management ---
let perfIntervalId = null;

function startPerfMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;

  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(monitorFPS);

  monitorWebVitalsAndLatency();

  perfIntervalId = setInterval(flushPerformanceMetrics, REPORTING_INTERVAL);

  const handleVisibilityOrUnload = (e) => {
    if (e.type === "pagehide" || document.visibilityState === "hidden") {
      flushPerformanceMetrics();
    }
  };

  window.addEventListener("visibilitychange", handleVisibilityOrUnload);
  window.addEventListener("pagehide", handleVisibilityOrUnload);
}

function stopPerfMonitoring() {
  isMonitoring = false;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (perfIntervalId) clearInterval(perfIntervalId);
}

export { startPerfMonitoring, stopPerfMonitoring, flushPerformanceMetrics };