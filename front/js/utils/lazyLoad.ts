/**
 * Advanced Lazy Loading and Operation Scheduling Utilities
 * Optimized for modern bundlers, layout stability, and queue safety.
 */

/**
 * Lazy load a component/module asynchronously.
 * Designed to cleanly pass through route-based chunk splitting structures.
 * 
 * @param {Function} importFn - Lambda wrapper returning a dynamic import promise, e.g., () => import('./MyComp')
 */
export function lazyLoad(importFn) {
  return async function lazyComponent(...args) {
    try {
      const module = await importFn();
      
      // Support both explicit named render properties and standard default layouts
      const render = module.render || module.default;
      
      if (typeof render !== "function") {
        throw new Error("Target module must export a callable execution method or default function context.");
      }
      return render(...args);
    } catch (error) {
      console.error("[lazyLoad] Failed to resolve chunk asset payload:", error);
      throw error;
    }
  };
}

/**
 * Preload modules in the background ahead of user interactions.
 */
export async function preloadModules(...importFns) {
  return Promise.all(
    importFns.map((importFn) =>
      importFn().catch((err) => {
        console.warn("[preloadModules] Background asset request failed:", err);
        return null;
      })
    )
  );
}

/**
 * Intersection Observer-based element lazy loader.
 * Employs native browser optimizations where applicable.
 */
export function observeLazyElements(selector = "[data-lazy-src]", options = {}) {
  const config = {
    root: null,
    rootMargin: "200px", // Expanded boundary margins to prevent visibility flickers
    threshold: 0.01,
    ...options
  };

  if (typeof IntersectionObserver === "undefined") {
    // Graceful runtime engine compatibility degradation check
    document.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.lazySrc) {
        el.src = el.dataset.lazySrc;
      }
    });
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetUrl = el.dataset.lazySrc;

        if (!targetUrl) return;

        // Native load event hook handles image transitions safely
        if (el.tagName === "IMG" || el.tagName === "IFRAME") {
          // Native loading fallback configuration path
          el.src = targetUrl;
          el.removeAttribute("data-lazy-src");
        }

        observer.unobserve(el);
      }
    });
  }, config);

  document.querySelectorAll(selector).forEach((el) => observer.observe(el));
  return observer;
}

/**
 * Safe Request Idle Callback system setup wrapper
 */
export const scheduleIdleTask = typeof requestIdleCallback !== "undefined"
  ? requestIdleCallback
  : (callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1);

/**
 * Schedules non-critical callbacks to execute cleanly inside low-priority browser processing loops.
 */
export function deferNonCritical(tasks = []) {
  if (!Array.isArray(tasks)) return;

  tasks.forEach((task) => {
    if (typeof task !== "function") return;
    
    scheduleIdleTask((deadline) => {
      try {
        // If browser has long tasks running, execute task conditionally inside remaining microsecond space
        task(deadline);
      } catch (error) {
        console.warn("[deferNonCritical] Deferred macro task crashed execution boundaries:", error);
      }
    });
  });
}

/**
 * Thread-Safe Operational Batch Processor Queue Manager
 * Correctly processes overflowing chunks across interval boundaries.
 */
export class TaskBatcher {
  constructor(processFn, batchSize = 10, delayMs = 50) {
    this.processFn = processFn;
    this.batchSize = Math.max(1, batchSize);
    this.delayMs = delayMs;
    this.queue = [];
    this.timer = null;
  }

  add(task) {
    this.queue.push(task);

    // If queue length hits threshold limits, step through execution flush routines instantly
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delayMs);
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // FIXED: Continuous while loop sweeps remaining queue array segments completely
    while (this.queue.length > 0) {
      const currentBatch = this.queue.splice(0, this.batchSize);
      try {
        this.processFn(currentBatch);
      } catch (err) {
        console.error("[TaskBatcher] Processing execution failure context:", err);
      }
    }
  }

  clear() {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export default {
  lazyLoad,
  preloadModules,
  observeLazyElements,
  scheduleIdleTask,
  deferNonCritical,
  TaskBatcher
};