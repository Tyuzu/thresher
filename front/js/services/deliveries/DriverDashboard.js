import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { navigate } from "../../routes/index.js";
import {
  fetchDriverStatus,
  setDriverOnline,
  setDriverOffline,
  sendGPSLocation,
  fetchActiveDeliveries,
  updateDeliveryStatus
} from "../../services/deliveries/deliveriesApi.js";

export async function DriverDashboard(container, isLoggedIn) {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : null;

  if (!contentContainer) {
    console.error("DriverDashboard: Missing DOM container element.");
    return;
  }

  contentContainer.replaceChildren();
  const PAGE_NAME = "driver-dashboard";

  let watchId = null;

  // --- ASIDE / SIDEBAR ACTIONS ---
  const asideChildren = [
    Button("Available Jobs Feed", "btn-jobs-feed", { click: () => navigate("/deliveries/available") }, "buttonx primary"),
    Button("Earnings History", "btn-earnings", { click: () => navigate("/driver/earnings") }, "buttonx secondary"),
    Button("SOS / Support", "btn-support", { click: () => alert("Connecting to Dispatcher...") }, "buttonx danger"),
    adspace("aside", PAGE_NAME, { width: 300, height: 250, refreshInterval: 30000 })
  ];

  const asideContent = createAsideContent({
    title: "Driver Controls",
    children: asideChildren,
    showAd: false
  });

  // --- MAIN LAYOUT HEADER ---
  const mainHeader = [
    createElement("div", { class: "driver-dashboard-header" }, [
      createElement("h1", {}, ["Courier Console & Tracking"])
    ]),
    adspace("inbody", PAGE_NAME, { width: 728, height: 90, refreshInterval: 45000 })
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "driver-dashboard-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector(".layout-main");

  // Elements & State Indicators
  const statusIndicator = createElement("span", { 
    class: "driver-status-badge offline" 
  }, ["OFFLINE"]);
  
  const locationReadout = createElement("div", { class: "gps-readout" }, ["GPS Idle"]);

  // High-accuracy live position tracker using watchPosition
  const startGpsTracker = () => {
    if (!navigator.geolocation) {
      locationReadout.textContent = "Geolocation is not supported by your browser.";
      return;
    }

    if (watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0
        };

        try {
          await sendGPSLocation(payload);
          locationReadout.textContent = `📍 Live GPS: ${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)} (${Math.round((payload.speed || 0) * 3.6)} km/h)`;
        } catch (err) {
          locationReadout.textContent = `⚠️ GPS Sync Failed: ${err?.message || "Network Error"}`;
        }
      },
      (err) => {
        locationReadout.textContent = `❌ GPS Error: ${err.message}`;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const stopGpsTracker = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    locationReadout.textContent = "GPS Tracking Stopped";
  };

  // Toggle Driver Online / Offline Status
  const toggleStatusBtn = Button("Go Online", "btn-toggle-online", {
    click: async () => {
      const isCurrentlyOnline = statusIndicator.classList.contains("online");
      try {
        if (isCurrentlyOnline) {
          await setDriverOffline();
          statusIndicator.textContent = "OFFLINE";
          statusIndicator.className = "driver-status-badge offline";
          toggleStatusBtn.textContent = "Go Online";
          stopGpsTracker();
          Notify("Driver status set to Offline", { type: "info" });
        } else {
          await setDriverOnline();
          statusIndicator.textContent = "ONLINE";
          statusIndicator.className = "driver-status-badge online";
          toggleStatusBtn.textContent = "Go Offline";
          startGpsTracker();
          Notify("Driver status set to Online", { type: "success" });
        }
      } catch (err) {
        Notify(err?.message || "Failed to update driver status", { type: "error" });
      }
    }
  }, "btn-primary");

  // Metrics Bar
  const metricsBar = createElement("div", { 
    class: "driver-metrics-bar"
  }, [
    createMetricCard("Today's Earnings", "$142.50"),
    createMetricCard("Completed", "6 Jobs"),
    createMetricCard("Rating", "4.95 ★")
  ]);

  const activeJobsContainer = createElement("div", { class: "active-jobs-list" }, [
    createElement("div", { class: "loading" }, ["Loading active assignments..."])
  ]);

  const dashboardWrapper = createElement("div", { class: "driver-dashboard" }, [
    metricsBar,

    // Status Control Card
    createElement("div", { class: "driver-control-card" }, [
      createElement("h2", { class: "card-title" }, ["Location & Duty Status"]),
      createElement("div", { class: "status-row" }, [
        createElement("strong", {}, ["Duty Status: "]),
        statusIndicator
      ]),
      createElement("div", { class: "action-row" }, [toggleStatusBtn]),
      locationReadout
    ]),

    // Active Jobs Card
    createElement("div", { class: "active-jobs-card" }, [
      createElement("h3", { class: "card-title" }, ["Active Deliveries"]),
      activeJobsContainer
    ])
  ]);

  mainElement.append(dashboardWrapper);

  // Hydration logic
  try {
    const statusRes = await fetchDriverStatus();
    if (statusRes?.is_online || statusRes?.status === "online") {
      statusIndicator.textContent = "ONLINE";
      statusIndicator.className = "driver-status-badge online";
      toggleStatusBtn.textContent = "Go Offline";
      startGpsTracker();
    }

    const activeRes = await fetchActiveDeliveries();
    const activeDeliveries = Array.isArray(activeRes) ? activeRes : activeRes?.deliveries || [];
    activeJobsContainer.replaceChildren();

    if (activeDeliveries.length === 0) {
      activeJobsContainer.append(
        createElement("div", { class: "empty-jobs" }, [
          "No active delivery tasks assigned. Go online or check the Available Jobs feed!"
        ])
      );
    } else {
      activeDeliveries.forEach((job) => {
        const jobId = job.deliveryid ?? job.id;
        const pickupAddr = job.pickup_loc?.address || "N/A";
        const dropoffAddr = job.dropoff_loc?.address || "N/A";

        // Deep-link to navigation maps
        const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropoffAddr)}`;

        const card = createElement("div", { class: "job-item-card" }, [
          createElement("div", { class: "job-header-row" }, [
            createElement("strong", {}, [`Job #${jobId}`]),
            createElement("span", { class: "job-status-text" }, [job.status || "IN_PROGRESS"])
          ]),
          createElement("div", { class: "job-pickup" }, [`📍 Pickup: ${pickupAddr}`]),
          createElement("div", { class: "job-dropoff" }, [`🎯 Dropoff: ${dropoffAddr}`]),
          
          createElement("div", { class: "job-actions-row" }, [
            Button("Navigate Map", `btn-nav-${jobId}`, {
              click: () => window.open(navUrl, "_blank")
            }, "buttonx secondary"),

            Button("Complete Handover", `btn-complete-${jobId}`, {
              click: async () => {
                const otp = prompt("Enter Handover Verification OTP:");
                if (otp) {
                  try {
                    await updateDeliveryStatus(jobId, { status: "DELIVERED", otp });
                    Notify("Delivery completed successfully!", { type: "success" });
                    DriverDashboard(container, isLoggedIn);
                  } catch (err) {
                    Notify(err?.message || "Verification failed.", { type: "error" });
                  }
                }
              }
            }, "buttonx primary")
          ])
        ]);

        activeJobsContainer.append(card);
      });
    }
  } catch (err) {
    activeJobsContainer.replaceChildren(
      createElement("div", { class: "error-text" }, [
        "Could not load active driver details."
      ])
    );
  }
}

// Helper component for shift stats
function createMetricCard(label, value) {
  return createElement("div", { class: "metric-card" }, [
    createElement("span", { class: "metric-label" }, [label]),
    createElement("strong", { class: "metric-value" }, [value])
  ]);
}

export default DriverDashboard;