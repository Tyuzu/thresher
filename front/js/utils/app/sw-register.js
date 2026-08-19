let serviceWorkerRefreshing = false;

/* =========================================================
   SERVICE WORKER
========================================================= */
export function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        console.warn("[SW] Service workers are not supported.");
        return;
    }

    let hadController = Boolean(navigator.serviceWorker.controller);

    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("/service-worker.js", {
                updateViaCache: "none"
            });
            console.log("[SW] Registered:", registration.scope);

            try {
                await registration.update();
            } catch (error) {
                console.warn("[SW] Update check failed:", error);
            }

            if (registration.waiting) {
                requestServiceWorkerActivation(registration.waiting);
            }

            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        console.log("[SW] New version available.");
                        requestServiceWorkerActivation(newWorker);
                    }
                });
            });
        } catch (error) {
            console.error("[SW] Registration failed:", error);
        }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) {
            hadController = true;
            return;
        }
        if (serviceWorkerRefreshing) return;
        serviceWorkerRefreshing = true;
        console.log("[SW] Controller changed. Reloading application.");
        window.location.reload();
    });

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
}


function requestServiceWorkerActivation(worker) {
    if (!worker) return;
    worker.postMessage({ type: "SKIP_WAITING" });
}

function handleServiceWorkerMessage(event) {
    const data = event.data;
    if (!data?.type) return;

    switch (data.type) {
        case "SW_ACTIVATED":
            console.log("[SW] Active version:", data.version);
            break;
        case "SW_VERSION":
            console.log("[SW] Version:", data.version);
            break;
    }
}
