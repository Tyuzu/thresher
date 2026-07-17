import { queueActivity } from "./activity_x.js";

const REPORTING_INTERVAL = 30000; // 30 seconds

// --- 1. FPS Monitoring (Aggregated) ---
let lastFrame = performance.now();
let frames = 0;
let fpsSamples = [];

function monitorFPS() {
  const now = performance.now();
  frames++;
  
  if (now - lastFrame >= 1000) {
    fpsSamples.push(frames);
    frames = 0;
    lastFrame = now;
  }
  
  requestAnimationFrame(monitorFPS);
}

// --- 2. Input Latency Monitoring (Aggregated) ---
let latencySamples = [];

function monitorInputLatency() {
  // Use PerformanceObserver for modern Interaction to Next Paint (INP) / Event Timing
  if (typeof PerformanceObserver !== "undefined") {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // entry.duration represents the total time from interaction to next paint
          if (entry.interactionId && entry.duration > 0) {
            latencySamples.push(entry.duration);
          }
        }
      });
      // 'event' captures clicks, keypresses, and taps
      observer.observe({ type: 'event', buffered: true });
      return;
    } catch (e) {
      // Fallback if 'event' type isn't supported
    }
  }

  // Fallback to manual calculation for older browsers
  document.addEventListener("click", () => {
    const start = performance.now();
    requestAnimationFrame(() => {
      latencySamples.push(performance.now() - start);
    });
  });
}

// --- 3. Memory Monitoring (Aggregated & Safe) ---
function getMemoryStats() {
  if (performance && performance.memory) {
    const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
    return {
      usedMB: Math.round(usedJSHeapSize / 1048576),
      totalMB: Math.round(totalJSHeapSize / 1048576),
    };
  }
  return null;
}

// --- 4. The Aggregation & Reporting Engine ---
function flushPerformanceMetrics() {
  // Process FPS
  if (fpsSamples.length > 0) {
    const total = fpsSamples.reduce((a, b) => a + b, 0);
    queueActivity("perf_fps_summary", {
      avg: Math.round(total / fpsSamples.length),
      min: Math.min(...fpsSamples),
      max: Math.max(...fpsSamples),
      samples: fpsSamples.length
    });
    fpsSamples = []; // Reset buffer
  }

  // Process Input Latency
  if (latencySamples.length > 0) {
    const total = latencySamples.reduce((a, b) => a + b, 0);
    queueActivity("perf_latency_summary", {
      avg: Math.round(total / latencySamples.length),
      max: Math.round(Math.max(...latencySamples)), // The most important metric for UX
      samples: latencySamples.length
    });
    latencySamples = []; // Reset buffer
  }

  // Process Memory
  const mem = getMemoryStats();
  if (mem) {
    queueActivity("perf_memory", mem);
  }
}

function startPerfMonitoring() {
  monitorFPS();
  monitorInputLatency();
  
  // Flush aggregated metrics every 30 seconds instead of flooding the queue
  setInterval(flushPerformanceMetrics, REPORTING_INTERVAL);
  
  // Ensure we flush on page exit
  window.addEventListener("beforeunload", flushPerformanceMetrics);
}

export { startPerfMonitoring };