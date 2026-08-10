import { createElement } from "../../components/createElement.js";
import Datex from "../../components/base/Datex.js";
import Button from "../../components/base/Button.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { navigate } from "../../routes/index.js";
import {
  fetchDeliveryTracking,
  fetchDeliveryEvents,
  fetchStatusHistory,
  getProofOfDelivery
} from "../../services/deliveries/deliveriesApi.js";

export async function DeliveryTracking(container, deliveryId, isLoggedIn) {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : null;

  if (!contentContainer) {
    console.error("DeliveryTracking: Missing DOM container element.");
    return;
  }

  contentContainer.replaceChildren();
  const PAGE_NAME = "delivery-tracking";

  // --- ASIDE & QUICK ACTIONS ---
  const asideChildren = [
    Button("← Back to Deliveries", "btn-back", { click: () => navigate("/deliveries") }, "buttonx secondary"),
    Button("Refresh Status", "btn-refresh", { click: () => DeliveryTracking(container, deliveryId, isLoggedIn) }, "buttonx primary"),
    adspace("aside", PAGE_NAME, { width: 300, height: 250, refreshInterval: 30000 })
  ];

  const asideContent = createAsideContent({
    title: "Tracking Actions",
    children: asideChildren,
    showAd: false
  });

  // --- MAIN LAYOUT HEADER ---
  const mainHeader = [
    createElement("div", { class: "tracking-header-title" }, [
      createElement("h1", {}, [`Live Tracking - Order #${deliveryId}`])
    ]),
    adspace("inbody", PAGE_NAME, { width: 728, height: 90, refreshInterval: 45000 })
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "delivery-tracking-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector(".layout-main");

  const pageWrapper = createElement("div", { class: "tracking-container" }, [
    createElement("div", { class: "tracking-loading" }, ["Fetching tracking details..."])
  ]);

  mainElement.append(pageWrapper);

  try {
    // Fetch tracking details and events concurrently
    const [trackingData, eventsData, statusHistory, proofData] = await Promise.allSettled([
      fetchDeliveryTracking(deliveryId),
      fetchDeliveryEvents(deliveryId),
      fetchStatusHistory(deliveryId),
      getProofOfDelivery(deliveryId)
    ]);

    const tracking = trackingData.status === "fulfilled" ? trackingData.value : {};
    const events = eventsData.status === "fulfilled" ? (Array.isArray(eventsData.value) ? eventsData.value : eventsData.value?.events || []) : [];
    const history = statusHistory.status === "fulfilled" ? (Array.isArray(statusHistory.value) ? statusHistory.value : statusHistory.value?.history || []) : [];
    const proof = proofData.status === "fulfilled" ? proofData.value : null;

    pageWrapper.replaceChildren();

    const currentStatus = (tracking.status || "CREATED").toUpperCase();
    const statusClass = `status-badge status-${currentStatus.toLowerCase()}`;

    // --- 1. VISUAL STEPPER TIMELINE ---
    const steps = ["CREATED", "DISPATCHED", "IN_TRANSIT", "DELIVERED"];
    const currentStepIndex = steps.indexOf(currentStatus);

    const stepper = createElement("div", { class: "tracking-stepper", style: "display:flex;justify-content:space-between;margin:20px 0;padding:15px;background:#f8f9fa;border-radius:8px;" },
      steps.map((step, idx) => {
        const isCompleted = idx <= currentStepIndex && currentStatus !== "CANCELLED";
        const style = `padding:8px 16px;border-radius:20px;font-size:12px;font-weight:bold;background:${isCompleted ? "#28a745" : "#e0e0e0"};color:${isCompleted ? "#fff" : "#555"};`;
        return createElement("div", { style }, [step.replace("_", " ")]);
      })
    );

    // --- 2. SUMMARY PANEL ---
    const summaryPanel = createElement("div", { class: "tracking-summary-panel", style: "background:#fff;padding:20px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:20px;" }, [
      createElement("div", { class: "summary-row", style: "display:flex;justify-content:space-between;margin-bottom:10px;" }, [
        createElement("span", { class: "label", style: "font-weight:bold;" }, ["Current Status:"]),
        createElement("span", { class: statusClass, style: "font-weight:bold;padding:4px 8px;border-radius:4px;" }, [currentStatus])
      ]),
      createElement("div", { class: "summary-row", style: "display:flex;justify-content:space-between;margin-bottom:10px;" }, [
        createElement("span", { class: "label", style: "font-weight:bold;" }, ["Current Coordinates:"]),
        createElement("span", { class: "value" }, [
          tracking.current_location
            ? `${tracking.current_location.lat}, ${tracking.current_location.lng}`
            : "Awaiting location lock..."
        ])
      ]),
      createElement("div", { class: "summary-row", style: "display:flex;justify-content:space-between;" }, [
        createElement("span", { class: "label", style: "font-weight:bold;" }, ["Estimated Arrival:"]),
        createElement("span", { class: "value" }, [
          tracking.eta ? Datex(tracking.eta, true) : "Calculating ETA..."
        ])
      ])
    ]);

    // --- 3. LIVE MAP PLACEHOLDER ---
    const mapSection = createElement("div", {
      class: "tracking-map-wrapper",
      style: "height:320px;background:#e9ecef;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:1px solid #ccc;"
    }, [
      createElement("div", { style: "text-align:center;" }, [
        createElement("p", { style: "font-size:16px;font-weight:bold;margin-bottom:5px;" }, [
          currentStatus === "IN_TRANSIT" ? "🛰️ Live GPS Tracking Active" : "📍 Route Map Overview"
        ]),
        createElement("span", { style: "color:#666;font-size:13px;" }, ["Interactive map view centered on target destination."])
      ])
    ]);

    // --- 4. COMBINED TIMELINE & ACTIVITY LOGS ---
    const historyList = createElement("div", { class: "tracking-history-list" });

    if (history.length === 0 && events.length === 0) {
      historyList.appendChild(
        createElement("div", { class: "empty-history", style: "padding:15px;color:#777;text-align:center;" }, ["No status updates recorded yet."])
      );
    } else {
      const combinedLogs = [...history, ...events].sort(
        (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
      );

      combinedLogs.forEach((log) => {
        historyList.appendChild(
          createElement("div", { class: "history-item", style: "padding:10px 0;border-bottom:1px solid #eee;" }, [
            createElement("div", { class: "history-timestamp", style: "font-size:12px;color:#888;" }, [
              Datex(log.created_at || log.timestamp || Date.now(), true)
            ]),
            createElement("div", { class: "history-event", style: "font-weight:bold;color:#333;" }, [
              log.status || log.event_type || "Event logged"
            ]),
            log.description ? createElement("div", { class: "history-desc", style: "color:#555;font-size:14px;" }, [log.description]) : ""
          ])
        );
      });
    }

    const historySection = createElement("div", { class: "tracking-section", style: "background:#fff;padding:20px;border-radius:8px;border:1px solid #e0e0e0;" }, [
      createElement("h3", { style: "margin-bottom:15px;" }, ["Activity History"]),
      historyList
    ]);

    // --- 5. PROOF OF DELIVERY PANEL ---
    let proofSection = null;
    if (proof && proof.url) {
      proofSection = createElement("div", { class: "tracking-section proof-section", style: "margin-top:20px;background:#fff;padding:20px;border-radius:8px;border:1px solid #e0e0e0;" }, [
        createElement("h3", { style: "margin-bottom:10px;" }, ["Proof of Delivery"]),
        createElement("div", { style: "display:flex;gap:20px;align-items:flex-start;" }, [
          createElement("img", {
            src: proof.url,
            alt: "Proof of Delivery",
            class: "proof-image",
            style: "max-width:200px;border-radius:6px;border:1px solid #ccc;cursor:pointer;",
            events: { click: () => window.open(proof.url, "_blank") }
          }),
          createElement("div", {}, [
            proof.recipient_name ? createElement("p", {}, [createElement("strong", {}, ["Received By: "]), proof.recipient_name]) : "",
            proof.timestamp ? createElement("p", {}, [createElement("strong", {}, ["Signed At: "]), Datex(proof.timestamp, true)]) : "",
            proof.notes ? createElement("p", { class: "proof-notes" }, [createElement("strong", {}, ["Notes: "]), proof.notes]) : ""
          ])
        ])
      ]);
    }

    pageWrapper.append(stepper, summaryPanel, mapSection, historySection);
    if (proofSection) pageWrapper.append(proofSection);

  } catch (err) {
    pageWrapper.replaceChildren(
      createElement("div", { class: "tracking-error", style: "padding:20px;color:#d9534f;background:#fdf7f7;border-radius:8px;" }, [
        err?.message || "Failed to load live tracking data."
      ])
    );
  }
}

export default DeliveryTracking;