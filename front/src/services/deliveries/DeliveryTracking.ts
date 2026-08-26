import { createElement } from "../../components/createElement.js";
import Datex from "../../components/base/Datex.js";
import Button from "../../components/base/Button.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { navigate } from "../../routes/navigate.js";
import {
  fetchDeliveryTracking,
  fetchDeliveryEvents,
  fetchStatusHistory,
  getProofOfDelivery
} from "../../services/deliveries/deliveriesApi.js";

// Interface definitions
interface CurrentLocation {
  lat?: number | string;
  lng?: number | string;
  [key: string]: any;
}

interface DeliveryTrackingData {
  status?: string;
  current_location?: CurrentLocation;
  eta?: string | number;
  [key: string]: any;
}

interface DeliveryEvent {
  created_at?: string | number;
  timestamp?: string | number;
  status?: string;
  event_type?: string;
  description?: string;
  [key: string]: any;
}

interface ProofOfDelivery {
  url?: string;
  timestamp?: string | number;
  recipient_name?: string;
  notes?: string;
  [key: string]: any;
}

export async function DeliveryTracking(
  container: HTMLElement | null,
  deliveryId: string | number,
  isLoggedIn?: boolean
): Promise<void> {
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
  const actionButtons = [
    Button({
      title: "← Back to Deliveries",
      id: "btn-back",
      events: { click: () => navigate("/deliveries") },
      classes: "buttonx secondary"
    }),
    Button({
      title: "Refresh Status",
      id: "btn-refresh",
      events: { click: () => DeliveryTracking(container, deliveryId, isLoggedIn) },
      classes: "buttonx primary"
    })
  ];

  const actionsWrapper = createElement("div", { class: "aside-actions-group" }, actionButtons);

  const sidebarAd = adspace("aside", PAGE_NAME, {
    layout: "vertical",
    width: 300,
    height: 250,
    refreshInterval: 30000
  });

  const asideContent = createAsideContent({
    title: "Tracking Actions",
    sections: [
      {
        title: "Actions",
        content: actionsWrapper,
        className: "aside-actions-section"
      },
      {
        content: sidebarAd,
        className: "aside-ad-section"
      }
    ],
    showAd: false, // Handled directly via custom section
    page: PAGE_NAME
  });

  // --- MAIN LAYOUT HEADER ---
  const mainHeader = [
    createElement("div", { class: "tracking-header-title" }, [
      createElement("h1", {}, [`Live Tracking - Order #${deliveryId}`])
    ]),
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal", width: 728, height: 90, refreshInterval: 45000
    })
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "delivery-tracking-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector(".layout-main");

  if (!mainElement) {
    console.error("DeliveryTracking: Main layout container element missing.");
    return;
  }

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

    const tracking: DeliveryTrackingData = trackingData.status === "fulfilled" ? trackingData.value : {};
    
    const eventsVal: any = eventsData.status === "fulfilled" ? eventsData.value : [];
    const events: DeliveryEvent[] = Array.isArray(eventsVal) ? eventsVal : eventsVal?.events || [];
    
    const historyVal: any = statusHistory.status === "fulfilled" ? statusHistory.value : [];
    const history: DeliveryEvent[] = Array.isArray(historyVal) ? historyVal : historyVal?.history || [];
    
    const proof: ProofOfDelivery | null = proofData.status === "fulfilled" ? proofData.value : null;

    pageWrapper.replaceChildren();

    const currentStatus = (tracking.status || "CREATED").toUpperCase();

    // --- 1. VISUAL STEPPER TIMELINE ---
    const steps = ["CREATED", "DISPATCHED", "IN_TRANSIT", "DELIVERED"];
    const currentStepIndex = steps.indexOf(currentStatus);

    const stepper = createElement("div", { class: "tracking-stepper" },
      steps.map((step, idx) => {
        const isCompleted = idx <= currentStepIndex && currentStatus !== "CANCELLED";
        const stepClass = `stepper-step ${isCompleted ? "completed" : "pending"}`;
        return createElement("div", { class: stepClass }, [step.replace("_", " ")]);
      })
    );

    // --- 2. SUMMARY PANEL ---
    const summaryPanel = createElement("div", { class: "tracking-summary-panel" }, [
      createElement("div", { class: "summary-row" }, [
        createElement("span", { class: "label" }, ["Current Status:"]),
        createElement("span", { class: `status-badge status-${currentStatus.toLowerCase()}` }, [currentStatus])
      ]),
      createElement("div", { class: "summary-row" }, [
        createElement("span", { class: "label" }, ["Current Coordinates:"]),
        createElement("span", { class: "value" }, [
          tracking.current_location
            ? `${tracking.current_location.lat}, ${tracking.current_location.lng}`
            : "Awaiting location lock..."
        ])
      ]),
      createElement("div", { class: "summary-row" }, [
        createElement("span", { class: "label" }, ["Estimated Arrival:"]),
        createElement("span", { class: "value" }, [
          tracking.eta ? Datex(tracking.eta, true) : "Calculating ETA..."
        ])
      ])
    ]);

    // --- 3. LIVE MAP PLACEHOLDER ---
    const mapSection = createElement("div", { class: "tracking-map-wrapper" }, [
      createElement("div", { class: "map-content" }, [
        createElement("p", { class: "map-title" }, [
          currentStatus === "IN_TRANSIT" ? "🛰️ Live GPS Tracking Active" : "📍 Route Map Overview"
        ]),
        createElement("span", { class: "map-subtitle" }, ["Interactive map view centered on target destination."])
      ])
    ]);

    // --- 4. COMBINED TIMELINE & ACTIVITY LOGS ---
    const historyList = createElement("div", { class: "tracking-history-list" });

    if (history.length === 0 && events.length === 0) {
      historyList.appendChild(
        createElement("div", { class: "empty-history" }, ["No status updates recorded yet."])
      );
    } else {
      const combinedLogs = [...history, ...events].sort(
        (a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime()
      );

      combinedLogs.forEach((log) => {
        historyList.appendChild(
          createElement("div", { class: "history-item" }, [
            createElement("div", { class: "history-timestamp" }, [
              Datex(log.created_at || log.timestamp || Date.now(), true)
            ]),
            createElement("div", { class: "history-event" }, [
              log.status || log.event_type || "Event logged"
            ]),
            log.description ? createElement("div", { class: "history-desc" }, [log.description]) : ""
          ])
        );
      });
    }

    const historySection = createElement("div", { class: "tracking-section" }, [
      createElement("h3", { class: "section-title" }, ["Activity History"]),
      historyList
    ]);

    // --- 5. PROOF OF DELIVERY PANEL ---
    let proofSection: HTMLElement | null = null;
    if (proof && proof.url) {
      proofSection = createElement("div", { class: "tracking-section proof-section" }, [
        createElement("h3", { class: "section-title" }, ["Proof of Delivery"]),
        createElement("div", { class: "proof-content" }, [
          createElement("img", {
            src: proof.url,
            alt: "Proof of Delivery",
            class: "proof-image",
            events: { click: () => window.open(proof.url, "_blank") }
          }),
          createElement("div", { class: "proof-details" }, [
            proof.recipient_name ? createElement("p", {}, [createElement("strong", {}, ["Received By: "]), proof.recipient_name]) : "",
            proof.timestamp ? createElement("p", {}, [createElement("strong", {}, ["Signed At: "]), Datex(proof.timestamp, true)]) : "",
            proof.notes ? createElement("p", { class: "proof-notes" }, [createElement("strong", {}, ["Notes: "]), proof.notes]) : ""
          ].filter(Boolean))
        ])
      ]);
    }

    pageWrapper.append(stepper, summaryPanel, mapSection, historySection);
    if (proofSection) pageWrapper.append(proofSection);

  } catch (err: any) {
    pageWrapper.replaceChildren(
      createElement("div", { class: "tracking-error" }, [
        err?.message || "Failed to load live tracking data."
      ])
    );
  }
}

export default DeliveryTracking;