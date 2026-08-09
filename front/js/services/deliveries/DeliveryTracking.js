import { createElement } from "../../components/createElement.js";
import Datex from "../../components/base/Datex.js";
import {
  fetchDeliveryTracking,
  fetchDeliveryEvents,
  fetchStatusHistory,
  getProofOfDelivery
} from "../../services/deliveries/deliveriesApi.js";

export async function DeliveryTracking(container, deliveryId, isLoggedIn) {
  if (!container || !container.nodeType) {
    console.error("DeliveryTracking: Missing DOM container element.");
    return;
  }

  container.innerHTML = "";

  const pageWrapper = createElement("div", { class: "tracking-container" }, [
    createElement("h2", { class: "tracking-title" }, [`Live Tracking - Order #${deliveryId}`]),
    createElement("div", { class: "tracking-loading" }, ["Fetching tracking details..."])
  ]);

  container.appendChild(pageWrapper);

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

    pageWrapper.innerHTML = "";

    // Header Summary Panel
    const statusClass = `status-badge status-${(tracking.status || "created").toLowerCase()}`;
    const summaryPanel = createElement("div", { class: "tracking-summary-panel" }, [
      createElement("div", { class: "summary-row" }, [
        createElement("span", { class: "label" }, ["Status: "]),
        createElement("span", { class: statusClass }, [tracking.status || "UNKNOWN"])
      ]),
      createElement("div", { class: "summary-row" }, [
        createElement("span", { class: "label" }, ["Current Location: "]),
        createElement("span", { class: "value" }, [
          tracking.current_location ? `${tracking.current_location.lat}, ${tracking.current_location.lng}` : "Awaiting location lock..."
        ])
      ]),
      createElement("div", { class: "summary-row" }, [
        createElement("span", { class: "label" }, ["Estimated Arrival: "]),
        createElement("span", { class: "value" }, [
          tracking.eta ? Datex(tracking.eta, true) : "Calculating ETA..."
        ])
      ])
    ]);

    // Timeline / Status History
    const historyList = createElement("div", { class: "tracking-history-list" });

    if (history.length === 0 && events.length === 0) {
      historyList.appendChild(
        createElement("div", { class: "empty-history" }, ["No status updates recorded yet."])
      );
    } else {
      const combinedLogs = [...history, ...events].sort(
        (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
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
      createElement("h3", {}, ["Activity History"]),
      historyList
    ]);

    // Proof of Delivery Panel (if complete)
    let proofSection = "";
    if (proof && proof.url) {
      proofSection = createElement("div", { class: "tracking-section proof-section" }, [
        createElement("h3", {}, ["Proof of Delivery"]),
        createElement("img", { src: proof.url, alt: "Proof of Delivery", class: "proof-image" }),
        proof.notes ? createElement("p", { class: "proof-notes" }, [`Notes: ${proof.notes}`]) : ""
      ]);
    }

    pageWrapper.appendChild(summaryPanel);
    pageWrapper.appendChild(historySection);
    if (proofSection) pageWrapper.appendChild(proofSection);

  } catch (err) {
    pageWrapper.innerHTML = "";
    pageWrapper.appendChild(
      createElement("div", { class: "tracking-error" }, [
        err?.message || "Failed to load live tracking data."
      ])
    );
  }
}

export default DeliveryTracking;