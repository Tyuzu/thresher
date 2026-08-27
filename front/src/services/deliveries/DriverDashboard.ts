import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { navigate } from "../../routes/navigate.js";
import {
  fetchDriverStatus,
  setDriverOnline,
  setDriverOffline,
  sendGPSLocation,
  fetchActiveDeliveries,
  updateDeliveryStatus
} from "../../services/deliveries/deliveriesApi.js";

// Interface definitions for API payloads and objects
interface GpsPayload {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

interface DeliveryLocation {
  address?: string;
}

interface DeliveryJob {
  deliveryid?: string | number;
  id?: string | number;
  pickup_loc?: DeliveryLocation;
  dropoff_loc?: DeliveryLocation;
  status?: string;
}

interface ActiveDeliveriesResponse {
  deliveries?: DeliveryJob[];
  [key: string]: any;
}

interface DriverStatusResponse {
  is_online?: boolean;
  status?: string;
  [key: string]: any;
}

// Keep active tracker references at module scope or attach cleanup to container
let activeWatchId: number | null = null;

export function stopGpsTracker(): void {
  if (activeWatchId !== null) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
}

export async function DriverDashboard(container: HTMLElement | null, isLoggedIn: boolean): Promise<void> {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : null;

  if (!contentContainer) {
    console.error("DriverDashboard: Missing DOM container element.");
    return;
  }

  // Ensure any previous geolocation tracking loop is cleaned up before re-rendering
  stopGpsTracker();

  contentContainer.replaceChildren();
  const PAGE_NAME = "driver-dashboard";

  // --- ASIDE / SIDEBAR ACTIONS ---
  const asideChildren = [
    Button({
      title: "Available Jobs Feed",
      id: "btn-jobs-feed",
      events: { click: () => navigate("/deliveries/available") },
      classes: "buttonx primary"
    }),
    Button({
      title: "Earnings History",
      id: "btn-earnings",
      events: { click: () => navigate("/driver/earnings") },
      classes: "buttonx secondary"
    }),
    Button({
      title: "SOS / Support",
      id: "btn-support",
      events: { click: () => alert("Connecting to Dispatcher...") },
      classes: "buttonx danger"
    }),
    adspace("aside", PAGE_NAME, {
      layout: "vertical", width: 300, height: 250, refreshInterval: 30000
    })
  ];

  const asideContent = createAsideContent({
    title: "Driver Controls",
    children: asideChildren,
    showAd: false
  });

  // --- MAIN LAYOUT HEADER ---
  const mainHeader = [
    createElement("header", { class: "driver-dashboard-header" }, [
      createElement("h1", {}, ["Courier Console & Tracking"])
    ]),
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal", width: 728, height: 90, refreshInterval: 45000
    })
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "driver-dashboard-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector("main") || layout.querySelector(".layout-main");

  if (!mainElement) {
    console.error("DriverDashboard: Main element layout target not found.");
    return;
  }

  // State Indicators
  const statusIndicator = createElement("span", {
    class: "driver-status-badge offline",
    id: "duty-status-badge"
  }, ["OFFLINE"]);

  const locationReadout = createElement("div", {
    class: "gps-readout",
    role: "status",
    "aria-live": "polite"
  }, ["GPS Idle"]);

  // Start High-Accuracy Position Tracking
  const startGpsTracker = (): void => {
    if (!navigator.geolocation) {
      locationReadout.textContent = "Geolocation is not supported by your browser.";
      return;
    }

    if (activeWatchId !== null) return;

    activeWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const payload: GpsPayload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0
        };

        try {
          await sendGPSLocation(payload);
          const speedKmH = Math.round((payload.speed || 0) * 3.6);
          locationReadout.textContent = `📍 Live GPS: ${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)} (${speedKmH} km/h)`;
        } catch (err: any) {
          locationReadout.textContent = `⚠️ GPS Sync Failed: ${err?.message || "Network Error"}`;
        }
      },
      (err) => {
        locationReadout.textContent = `❌ GPS Error: ${err.message}`;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  // Toggle Driver Online / Offline Status Button
  const toggleStatusBtn = Button({
    title: "Go Online",
    id: "btn-toggle-online",
    events: {
      click: async () => {
        const isCurrentlyOnline = statusIndicator.classList.contains("online");
        (toggleStatusBtn as HTMLButtonElement).disabled = true;

        try {
          if (isCurrentlyOnline) {
            await setDriverOffline();
            statusIndicator.textContent = "OFFLINE";
            statusIndicator.className = "driver-status-badge offline";
            toggleStatusBtn.textContent = "Go Online";
            toggleStatusBtn.setAttribute("aria-label", "Switch duty status to online");
            stopGpsTracker();
            locationReadout.textContent = "GPS Tracking Stopped";
            Notify("Driver status set to Offline", { type: "info" });
          } else {
            await setDriverOnline();
            statusIndicator.textContent = "ONLINE";
            statusIndicator.className = "driver-status-badge online";
            toggleStatusBtn.textContent = "Go Offline";
            toggleStatusBtn.setAttribute("aria-label", "Switch duty status to offline");
            startGpsTracker();
            Notify("Driver status set to Online", { type: "success" });
          }
        } catch (err: any) {
          Notify(err?.message || "Failed to update driver status", { type: "error" });
        } finally {
          (toggleStatusBtn as HTMLButtonElement).disabled = false;
        }
      }
    },
    classes: "btn-primary"
  });

  toggleStatusBtn.setAttribute("aria-label", "Switch duty status to online");

  // Shift Performance Metrics
  const metricsBar = createElement("section", {
    class: "driver-metrics-bar",
    "aria-label": "Shift Performance Metrics"
  }, [
    createMetricCard("Today's Earnings", "$142.50"),
    createMetricCard("Completed", "6 Jobs"),
    createMetricCard("Rating", "4.95 ★")
  ]);

  const activeJobsContainer = createElement("div", {
    class: "active-jobs-list",
    role: "feed",
    "aria-live": "polite",
    "aria-label": "Assigned active deliveries feed"
  }, [
    createElement("div", { class: "loading", role: "status" }, ["Loading active assignments..."])
  ]);

  const dashboardWrapper = createElement("div", { class: "driver-dashboard" }, [
    metricsBar,
    createElement("section", {
      class: "driver-control-card",
      "aria-labelledby": "status-card-title"
    }, [
      createElement("h2", { id: "status-card-title", class: "card-title" }, ["Location & Duty Status"]),
      createElement("div", { class: "status-row", "aria-live": "polite", "aria-atomic": "true" }, [
        createElement("strong", { id: "duty-label" }, ["Duty Status: "]),
        statusIndicator
      ]),
      createElement("div", { class: "action-row" }, [toggleStatusBtn]),
      locationReadout
    ]),
    createElement("section", {
      class: "active-jobs-card",
      "aria-labelledby": "active-jobs-title"
    }, [
      createElement("h2", { id: "active-jobs-title", class: "card-title" }, ["Active Deliveries"]),
      activeJobsContainer
    ])
  ]);

  mainElement.append(dashboardWrapper);

  // Load Active Deliveries Component
  const loadDeliveries = async (): Promise<void> => {
    try {
      const activeRes: any = await fetchActiveDeliveries();
      const activeDeliveries: DeliveryJob[] = Array.isArray(activeRes) ? activeRes : activeRes?.deliveries || [];
      activeJobsContainer.replaceChildren();

      if (activeDeliveries.length === 0) {
        activeJobsContainer.append(
          createElement("p", { class: "empty-jobs", role: "status" }, [
            "No active delivery tasks assigned. Go online or check the Available Jobs feed!"
          ])
        );
        return;
      }

      activeDeliveries.forEach((job) => {
        const jobId = job.deliveryid ?? job.id;
        const pickupAddr = job.pickup_loc?.address || "N/A";
        const dropoffAddr = job.dropoff_loc?.address || "N/A";
        const jobStatus = job.status || "IN_PROGRESS";

        const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropoffAddr)}`;

        const navBtn = Button({
          title: "Navigate Map",
          id: `btn-nav-${jobId}`,
          events: { click: () => window.open(navUrl, "_blank") },
          classes: "buttonx secondary"
        });
        navBtn.setAttribute("aria-label", `Navigate to dropoff address for Job ${jobId}`);

        const completeBtn = Button({
          title: "Complete Handover",
          id: `btn-complete-${jobId}`,
          events: {
            click: async () => {
              const otp = prompt("Enter Handover Verification OTP:");
              if (!otp) return;

              try {
                (completeBtn as HTMLButtonElement).disabled = true;
                await updateDeliveryStatus(jobId as string | number, { status: "DELIVERED", otp });
                Notify("Delivery completed successfully!", { type: "success" });
                await loadDeliveries(); // Re-fetch list instead of whole view re-render
              } catch (err: any) {
                Notify(err?.message || "Verification failed.", { type: "error" });
                (completeBtn as HTMLButtonElement).disabled = false;
              }
            }
          },
          classes: "buttonx primary"
        });
        completeBtn.setAttribute("aria-label", `Complete handover for Job ${jobId}`);

        const card = createElement("article", {
          class: "job-item-card",
          "aria-labelledby": `job-heading-${jobId}`
        }, [
          createElement("header", { class: "job-header-row" }, [
            createElement("h3", { id: `job-heading-${jobId}`, class: "job-title" }, [`Job #${jobId}`]),
            createElement("span", { class: `job-status-text status-${jobStatus.toLowerCase()}` }, [jobStatus])
          ]),
          createElement("dl", { class: "job-details-list" }, [
            createElement("div", { class: "job-detail-item" }, [
              createElement("dt", {}, ["Pickup:"]),
              createElement("dd", {}, [
                createElement("address", { class: "address-inline" }, [pickupAddr])
              ])
            ]),
            createElement("div", { class: "job-detail-item" }, [
              createElement("dt", {}, ["Dropoff:"]),
              createElement("dd", {}, [
                createElement("address", { class: "address-inline" }, [dropoffAddr])
              ])
            ])
          ]),
          createElement("footer", { class: "job-actions-row" }, [
            navBtn,
            completeBtn
          ])
        ]);

        activeJobsContainer.append(card);
      });
    } catch (err) {
      activeJobsContainer.replaceChildren(
        createElement("p", { class: "error-text", role: "alert" }, [
          "Could not load active driver details."
        ])
      );
    }
  };

  // Initial Hydration
  try {
    const statusRes: DriverStatusResponse = await fetchDriverStatus();
    if (statusRes?.is_online || statusRes?.status === "online") {
      statusIndicator.textContent = "ONLINE";
      statusIndicator.className = "driver-status-badge online";
      toggleStatusBtn.textContent = "Go Offline";
      toggleStatusBtn.setAttribute("aria-label", "Switch duty status to offline");
      startGpsTracker();
    }
    await loadDeliveries();
  } catch (err) {
    console.error("Dashboard hydration error:", err);
  }
}

function createMetricCard(label: string, value: string): HTMLElement {
  return createElement("div", { class: "metric-card" }, [
    createElement("dl", {}, [
      createElement("dt", { class: "metric-label" }, [label]),
      createElement("dd", { class: "metric-value" }, [value])
    ])
  ]);
}

export default DriverDashboard;