/* =========================================================
   TYPES & INTERFACES
========================================================= */

export type DynamicImportFn<T = any> = () => Promise<T>;

export interface ModuleWithRender<TArgs extends any[] = any[], TReturn = any> {
  render?: (...args: TArgs) => TReturn;
  default?: (...args: TArgs) => TReturn | { render?: (...args: TArgs) => TReturn };
}

export type IdleDeadlinePolyfill = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};

export type IdleTaskCallback = (deadline: IdleDeadlinePolyfill | IdleDeadline) => void;

export type TaskProcessor<T> = (batch: T[]) => void;

/* =========================================================
   LAZY LOADING & PRELOADING UTILITIES
========================================================= */

/**
 * Lazy load a component/module asynchronously.
 * Designed to cleanly pass through route-based chunk splitting structures.
 * 
 * @param importFn Lambda wrapper returning a dynamic import promise, e.g., () => import('./MyComp')
 */
export function lazyLoad<TArgs extends any[], TReturn>(
  importFn: DynamicImportFn<ModuleWithRender<TArgs, TReturn> | any>
): (...args: TArgs) => Promise<TReturn> {
  return async function lazyComponent(...args: TArgs): Promise<TReturn> {
    try {
      const module = await importFn();

      // Support both explicit named render properties and standard default layouts
      const render = module.render || (typeof module.default === "function" ? module.default : module.default?.render);

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
export async function preloadModules<T>(
  ...importFns: Array<DynamicImportFn<T>>
): Promise<Array<T | null>> {
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
export function observeLazyElements(
  selector: string = "[data-lazy-src]",
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  const config: IntersectionObserverInit = {
    root: null,
    rootMargin: "200px", // Expanded boundary margins to prevent visibility flickers
    threshold: 0.01,
    ...options
  };

  if (typeof IntersectionObserver === "undefined") {
    // Graceful runtime engine compatibility degradation check
    document.querySelectorAll<HTMLImageElement | HTMLIFrameElement>(selector).forEach((el) => {
      const targetUrl = el.dataset.lazySrc;
      if (targetUrl) {
        el.src = targetUrl;
      }
    });
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const targetUrl = el.dataset.lazySrc;

        if (!targetUrl) return;

        // Native load event hook handles image transitions safely
        if (el instanceof HTMLImageElement || el instanceof HTMLIFrameElement) {
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

/* =========================================================
   IDLE TASK SCHEDULING
========================================================= */

/**
 * Safe Request Idle Callback system setup wrapper
 */
export const scheduleIdleTask: (callback: IdleTaskCallback) => number =
  typeof window !== "undefined" && typeof window.requestIdleCallback !== "undefined"
    ? window.requestIdleCallback.bind(window)
    : (callback: IdleTaskCallback): number => {
        return (setTimeout as unknown as (fn: () => void, ms: number) => number)(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => 50
          });
        }, 1);
      };

/**
 * Schedules non-critical callbacks to execute cleanly inside low-priority browser processing loops.
 */
export function deferNonCritical(tasks: IdleTaskCallback[] = []): void {
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

/* =========================================================
   TASK BATCHER QUEUE CLASS
========================================================= */

/**
 * Thread-Safe Operational Batch Processor Queue Manager
 * Correctly processes overflowing chunks across interval boundaries.
 */
export class TaskBatcher<T = any> {
  private processFn: TaskProcessor<T>;
  private batchSize: number;
  private delayMs: number;
  private queue: T[];
  private timer: ReturnType<typeof setTimeout> | null;

  constructor(processFn: TaskProcessor<T>, batchSize = 10, delayMs = 50) {
    this.processFn = processFn;
    this.batchSize = Math.max(1, batchSize);
    this.delayMs = delayMs;
    this.queue = [];
    this.timer = null;
  }

  public add(task: T): void {
    this.queue.push(task);

    // If queue length hits threshold limits, step through execution flush routines instantly
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delayMs);
    }
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Continuous while loop sweeps remaining queue array segments completely
    while (this.queue.length > 0) {
      const currentBatch = this.queue.splice(0, this.batchSize);
      try {
        this.processFn(currentBatch);
      } catch (err) {
        console.error("[TaskBatcher] Processing execution failure context:", err);
      }
    }
  }

  public clear(): void {
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