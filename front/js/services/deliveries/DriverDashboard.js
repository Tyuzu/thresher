import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.mjs";
import {
  fetchDriverStatus,
  setDriverOnline,
  setDriverOffline,
  sendGPSLocation,
  fetchActiveDeliveries
} from "../../services/deliveries/deliveriesApi.js";

export async function DriverDashboard(container, isLoggedIn) {
  if (!container || !container.nodeType) {
    console.error("DriverDashboard: Missing DOM container element.");
    return;
  }

  container.innerHTML = "";
  let gpsInterval = null;

  const statusIndicator = createElement("span", { class: "driver-status-badge offline" }, ["OFFLINE"]);
  const locationReadout = createElement("div", { class: "gps-readout" }, ["GPS Idle"]);

  // Function to capture and send high-accuracy GPS coordinates
  const syncLocation = () => {
    if (!navigator.geolocation) {
      locationReadout.textContent = "Geolocation is not supported by your browser.";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0
        };

        try {
          await sendGPSLocation(payload);
          locationReadout.textContent = `GPS Synced: Lat ${payload.lat.toFixed(4)}, Lng ${payload.lng.toFixed(4)}`;
        } catch (err) {
          locationReadout.textContent = `GPS Sync Failed: ${err?.message || "Network Error"}`;
        }
      },
      (err) => {
        locationReadout.textContent = `GPS Error: ${err.message}`;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startGpsTracker = () => {
    syncLocation();
    if (!gpsInterval) {
      gpsInterval = setInterval(syncLocation, 15000); // Pulse every 15s while online
    }
  };

  const stopGpsTracker = () => {
    if (gpsInterval) {
      clearInterval(gpsInterval);
      gpsInterval = null;
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

  const activeJobsContainer = createElement("div", { class: "active-jobs-list" }, [
    createElement("div", { class: "loading" }, ["Loading active assignments..."])
  ]);

  const dashboardWrapper = createElement("div", { class: "driver-dashboard" }, [
    createElement("div", { class: "driver-control-card" }, [
      createElement("h2", {}, ["Driver Location Control"]),
      createElement("div", { class: "status-row" }, [
        createElement("strong", {}, ["Current Status: "]),
        statusIndicator
      ]),
      createElement("div", { class: "action-row" }, [toggleStatusBtn]),
      locationReadout
    ]),
    createElement("div", { class: "active-jobs-card" }, [
      createElement("h3", {}, ["My Active Deliveries"]),
      activeJobsContainer
    ])
  ]);

  container.appendChild(dashboardWrapper);

  // Initial State Hydration
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
    activeJobsContainer.innerHTML = "";

    if (activeDeliveries.length === 0) {
      activeJobsContainer.appendChild(
        createElement("div", { class: "empty-jobs" }, ["No active delivery tasks assigned."])
      );
    } else {
      activeDeliveries.forEach((job) => {
        activeJobsContainer.appendChild(
          createElement("div", { class: "job-item-card" }, [
            createElement("span", { class: "job-id" }, [`Job #${job.deliveryid ?? job.id}`]),
            createElement("span", { class: "job-status" }, [job.status]),
            createElement("div", { class: "job-pickup" }, [`From: ${job.pickup_loc?.address || "N/A"}`]),
            createElement("div", { class: "job-dropoff" }, [`To: ${job.dropoff_loc?.address || "N/A"}`])
          ])
        );
      });
    }
  } catch (err) {
    activeJobsContainer.innerHTML = "";
    activeJobsContainer.appendChild(
      createElement("div", { class: "error-text" }, ["Could not load active driver details."])
    );
  }
}

export default DriverDashboard;