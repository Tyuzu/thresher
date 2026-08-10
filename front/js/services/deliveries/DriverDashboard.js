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
    class: "driver-status-badge offline", 
    style: "padding:4px 12px;border-radius:12px;font-weight:bold;background:#dc3545;color:#fff;" 
  }, ["OFFLINE"]);
  
  const locationReadout = createElement("div", { class: "gps-readout", style: "font-size:13px;color:#666;margin-top:8px;" }, ["GPS Idle"]);

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
          statusIndicator.style.backgroundColor = "#dc3545";
          statusIndicator.className = "driver-status-badge offline";
          toggleStatusBtn.textContent = "Go Online";
          stopGpsTracker();
          Notify("Driver status set to Offline", { type: "info" });
        } else {
          await setDriverOnline();
          statusIndicator.textContent = "ONLINE";
          statusIndicator.style.backgroundColor = "#28a745";
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
    class: "driver-metrics-bar", 
    style: "display:grid;grid-template-columns:repeat(3, 1fr);gap:15px;margin-bottom:20px;" 
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
    createElement("div", { class: "driver-control-card", style: "background:#fff;padding:20px;border-radius:8px;border:1px solid #ddd;margin-bottom:20px;" }, [
      createElement("h2", { style: "margin-bottom:15px;" }, ["Location & Duty Status"]),
      createElement("div", { class: "status-row", style: "display:flex;align-items:center;gap:10px;margin-bottom:15px;" }, [
        createElement("strong", {}, ["Duty Status: "]),
        statusIndicator
      ]),
      createElement("div", { class: "action-row", style: "margin-bottom:10px;" }, [toggleStatusBtn]),
      locationReadout
    ]),

    // Active Jobs Card
    createElement("div", { class: "active-jobs-card", style: "background:#fff;padding:20px;border-radius:8px;border:1px solid #ddd;" }, [
      createElement("h3", { style: "margin-bottom:15px;" }, ["Active Deliveries"]),
      activeJobsContainer
    ])
  ]);

  mainElement.append(dashboardWrapper);

  // Hydration logic
  try {
    const statusRes = await fetchDriverStatus();
    if (statusRes?.is_online || statusRes?.status === "online") {
      statusIndicator.textContent = "ONLINE";
      statusIndicator.style.backgroundColor = "#28a745";
      statusIndicator.className = "driver-status-badge online";
      toggleStatusBtn.textContent = "Go Offline";
      startGpsTracker();
    }

    const activeRes = await fetchActiveDeliveries();
    const activeDeliveries = Array.isArray(activeRes) ? activeRes : activeRes?.deliveries || [];
    activeJobsContainer.replaceChildren();

    if (activeDeliveries.length === 0) {
      activeJobsContainer.append(
        createElement("div", { class: "empty-jobs", style: "padding:20px;text-align:center;color:#777;" }, [
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

        const card = createElement("div", { 
          class: "job-item-card", 
          style: "border:1px solid #eee;padding:15px;border-radius:6px;margin-bottom:15px;background:#fdfdfd;" 
        }, [
          createElement("div", { style: "display:flex;justify-content:space-between;margin-bottom:8px;" }, [
            createElement("strong", {}, [`Job #${jobId}`]),
            createElement("span", { style: "font-weight:bold;color:#007bff;" }, [job.status || "IN_PROGRESS"])
          ]),
          createElement("div", { class: "job-pickup", style: "margin-bottom:4px;" }, [`📍 Pickup: ${pickupAddr}`]),
          createElement("div", { class: "job-dropoff", style: "margin-bottom:12px;" }, [`🎯 Dropoff: ${dropoffAddr}`]),
          
          createElement("div", { style: "display:flex;gap:10px;" }, [
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
      createElement("div", { class: "error-text", style: "color:#d9534f;padding:10px;" }, [
        "Could not load active driver details."
      ])
    );
  }
}

// Helper component for shift stats
function createMetricCard(label, value) {
  return createElement("div", { 
    style: "background:#fff;padding:15px;border-radius:8px;border:1px solid #ddd;text-align:center;" 
  }, [
    createElement("span", { style: "font-size:12px;color:#666;display:block;" }, [label]),
    createElement("strong", { style: "font-size:20px;color:#333;" }, [value])
  ]);
}

export default DriverDashboard;