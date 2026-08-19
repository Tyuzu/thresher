export function trackError(error, context = {}) {
    const normalizedError = error instanceof Error ? error : new Error(String(error || "Unknown error"));
    console.error("[APP ERROR]", normalizedError, context);
    if (window.__errorTracker?.track) {
        try {
            window.__errorTracker.track(normalizedError, context);
        } catch (trackingError) {
            console.warn("[ERROR TRACKER] Failed:", trackingError);
        }
    }
}

/* =========================================================
   APPLICATION ERROR UI
========================================================= */
export function showApplicationError() {
    const container = document.createElement("div");
    Object.assign(container.style, {
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center"
    });
    container.innerHTML = `
        <main>
            <h1>Farmium couldn't start</h1>
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
                Refresh Farmium
            </button>
        </main>
    `;
    document.body.replaceChildren(container);
    document.getElementById("app-reload-button")?.addEventListener("click", () => {
        window.location.reload();
    });
}


export function initGlobalErrorListeners() {
    window.addEventListener("error", (e) => trackError(e.error || new Error(e.message), { type: "uncaught_error" }));
    window.addEventListener("unhandledrejection", (e) => trackError(e.reason, { type: "unhandled_rejection" }));
}