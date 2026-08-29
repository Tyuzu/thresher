/* =========================================================
   GLOBAL TYPE DECLARATIONS
========================================================= */
export type ErrorContext = Record<string, unknown>;

export interface ErrorTracker {
  track?: (error: Error, context?: ErrorContext) => void;
  trackMetric?: (eventName: string, details: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    __errorTracker?: ErrorTracker;
  }
}

/* =========================================================
   ERROR TRACKING
========================================================= */
export function trackError(error: unknown, context: ErrorContext = {}): void {
  const normalizedError: Error =
    error instanceof Error ? error : new Error(String(error || "Unknown error"));

  console.error("[APP ERROR]", normalizedError, context);

  if (window.__errorTracker?.track) {
    try {
      window.__errorTracker.track(normalizedError, context);
    } catch (trackingError: unknown) {
      console.warn("[ERROR TRACKER] Failed:", trackingError);
    }
  }
}

/* =========================================================
   APPLICATION ERROR UI
========================================================= */
export function showApplicationError(): void {
  const container = document.createElement("div");

  Object.assign(container.style, {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "2rem",
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
    textAlign: "center"
  } satisfies Partial<CSSStyleDeclaration>);

  container.innerHTML = `
    <main>
      <h1>Scav couldn't start</h1>
      <p>
        Something went wrong while loading the application.
        Please refresh the page or try again.
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
        Refresh Scav
      </button>
    </main>
  `;

  document.body.replaceChildren(container);

  const reloadButton = document.getElementById("app-reload-button");
  reloadButton?.addEventListener("click", () => {
    window.location.reload();
  });
}

/* =========================================================
   GLOBAL ERROR LISTENERS
========================================================= */
export function initGlobalErrorListeners(): void {
  window.addEventListener("error", (e: ErrorEvent) => {
    trackError(e.error || new Error(e.message), { type: "uncaught_error" });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    trackError(e.reason, { type: "unhandled_rejection" });
  });
}