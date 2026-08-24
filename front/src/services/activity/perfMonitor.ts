// src/utils/perfMonitor.ts
import { track } from "./metrics.js";

// --- Type Definitions ---
export interface FpsSummary {
  avg: number;
  min: number;
  max: number;
  samples: number;
}

export interface LatencySummary {
  avg: number;
  p95: number;
  max: number;
  samples: number;
}

export interface MemoryStats {
  usedMB: number;
  totalMB: number;
}

export interface VitalsSummary {
  memory?: MemoryStats;
  cls?: number;
  lcp_ms?: number;
}

// Non-standard Performance Memory Extension (Chromium)
interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

// Performance Entry Interfaces for Web Vitals & Event Timing
interface PerformanceEventTimingEntry extends PerformanceEntry {
  interactionId?: number;
  duration: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

// --- Constants ---
const REPORTING_INTERVAL = 30000; // 30 seconds
const MAX_SAMPLE_BUFFER = 1000;

// Internal Buffers
let fpsSamples: number[] = [];
let latencySamples: number[] = [];
let lastFrameTime: number = performance.now();
let frameCount = 0;
let animationFrameId: number | null = null;
let isMonitoring = false;

// --- 1. FPS Monitoring (Background-Aware) ---
function monitorFPS(): void {
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
let lcpMetric: number | null = null;

function monitorWebVitalsAndLatency(): void {
  if (typeof PerformanceObserver === "undefined") return;

  // Track INP / Event Timing
  try {
    const eventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTimingEntry[]) {
        if (entry.interactionId && entry.duration > 0) {
          if (latencySamples.length < MAX_SAMPLE_BUFFER) {
            latencySamples.push(Math.round(entry.duration));
          }
        }
      }
    });
    // Record interactions over 40ms
    eventObserver.observe({ type: "event", durationThreshold: 40, buffered: true } as PerformanceObserverInit);
  } catch {
    // Fallback for older browsers without durationThreshold support
  }

  // Track CLS (Cumulative Layout Shift)
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {}

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
  } catch {}
}

// --- 3. Memory Monitoring (Safe) ---
function getMemoryStats(): MemoryStats | null {
  const perf = (typeof performance !== "undefined" ? performance : null) as ExtendedPerformance | null;
  if (perf?.memory) {
    const { usedJSHeapSize, totalJSHeapSize } = perf.memory;
    return {
      usedMB: Math.round(usedJSHeapSize / 1048576),
      totalMB: Math.round(totalJSHeapSize / 1048576),
    };
  }
  return null;
}

// --- 4. Metric Aggregation & Reporting ---
function flushPerformanceMetrics(): void {
  // 1. Process FPS Summary
  if (fpsSamples.length > 0) {
    const total = fpsSamples.reduce((a, b) => a + b, 0);
    const summary: FpsSummary = {
      avg: Math.round(total / fpsSamples.length),
      min: Math.min(...fpsSamples),
      max: Math.max(...fpsSamples),
      samples: fpsSamples.length,
    };
    track("perf_fps_summary", summary as unknown as Record<string, unknown>);
    fpsSamples = [];
  }

  // 2. Process Input Latency Summary (INP)
  if (latencySamples.length > 0) {
    const total = latencySamples.reduce((a, b) => a + b, 0);
    const sorted = [...latencySamples].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    const summary: LatencySummary = {
      avg: Math.round(total / latencySamples.length),
      p95: sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      samples: latencySamples.length,
    };
    track("perf_latency_summary", summary as unknown as Record<string, unknown>);
    latencySamples = [];
  }

  // 3. Process Web Vitals & Memory
  const mem = getMemoryStats();
  if (mem || clsScore > 0 || lcpMetric !== null) {
    const summary: VitalsSummary = {
      ...(mem && { memory: mem }),
      ...(clsScore > 0 && { cls: Number(clsScore.toFixed(4)) }),
      ...(lcpMetric !== null && { lcp_ms: lcpMetric }),
    };
    track("perf_vitals_summary", summary as unknown as Record<string, unknown>);
  }
}

// --- 5. Lifecycle Management ---
let perfIntervalId: ReturnType<typeof setInterval> | null = null;

function startPerfMonitoring(): void {
  if (isMonitoring) return;
  isMonitoring = true;

  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(monitorFPS);

  monitorWebVitalsAndLatency();

  perfIntervalId = setInterval(flushPerformanceMetrics, REPORTING_INTERVAL);

  const handleVisibilityOrUnload = (e: Event): void => {
    if (e.type === "pagehide" || document.visibilityState === "hidden") {
      flushPerformanceMetrics();
    }
  };

  window.addEventListener("visibilitychange", handleVisibilityOrUnload);
  window.addEventListener("pagehide", handleVisibilityOrUnload);
}

function stopPerfMonitoring(): void {
  isMonitoring = false;
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  if (perfIntervalId !== null) clearInterval(perfIntervalId);
}

export { startPerfMonitoring, stopPerfMonitoring, flushPerformanceMetrics };