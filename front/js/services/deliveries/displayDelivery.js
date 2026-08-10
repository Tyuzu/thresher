import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";
import { navigate } from "../../routes/index.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { 
  fetchDeliveryById, 
  fetchDeliveryTracking,
  fetchDeliveryEvents,
  fetchStatusHistory,
  getProofOfDelivery,
  cancelDelivery, 
  claimDelivery, 
  updateDeliveryStatus 
} from "../../services/deliveries/deliveriesApi.js";

export async function displayDelivery(container, deliveryId, options = {}) {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : null;

  if (!contentContainer) {
    console.error("displayDelivery: Missing DOM container element.");
    return;
  }

  contentContainer.replaceChildren();
  const PAGE_NAME = "delivery-detail";
  const userRole = options.userRole || localStorage.getItem("user_role") || "courier";

  // --- 1. ASIDE LAYOUT ---
  const asideChildren = [
    Button("← Back to Deliveries", "btn-back-del", { click: () => navigate("/deliveries") }, "buttonx secondary"),
    Button("Refresh View", "btn-refresh-del", { click: () => displayDelivery(container, deliveryId, options) }, "buttonx primary"),
    adspace("aside", PAGE_NAME, { width: 300, height: 250, refreshInterval: 30000 })
  ];

  if (userRole === "sender") {
    asideChildren.splice(1, 0, 
      Button("Create New Delivery", "btn-crt-del", { click: () => navigate("/delivery/create") }, "buttonx primary")
    );
  }

  const asideContent = createAsideContent({
    title: "Delivery Actions",
    children: asideChildren,
    showAd: false
  });

  // --- 2. MAIN LAYOUT HEADER ---
  const mainHeader = [
    createElement("div", { class: "delivery-detail-header-row" }, [
      createElement("h1", {}, [`Delivery Tracking & Details - Order #${deliveryId}`])
    ]),
    adspace("inbody", PAGE_NAME, { width: 728, height: 90, refreshInterval: 45000 })
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "delivery-detail-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector(".layout-main");

  const pageWrapper = createElement("div", { class: "delivery-details-container" }, [
    createElement("div", { class: "deliveries-loading" }, ["Fetching delivery details and live tracking..."])
  ]);

  mainElement.append(pageWrapper);

  // --- 3. CONCURRENT DATA FETCHING ---
  try {
    const [itemRes, trackingRes, eventsRes, historyRes, proofRes] = await Promise.allSettled([
      fetchDeliveryById(deliveryId),
      fetchDeliveryTracking(deliveryId),
      fetchDeliveryEvents(deliveryId),
      fetchStatusHistory(deliveryId),
      getProofOfDelivery(deliveryId)
    ]);

    pageWrapper.replaceChildren();

    const item = itemRes.status === "fulfilled" ? itemRes.value : {};
    const tracking = trackingRes.status === "fulfilled" ? trackingRes.value : {};
    const events = eventsRes.status === "fulfilled" ? (Array.isArray(eventsRes.value) ? eventsRes.value : eventsRes.value?.events || []) : [];
    const history = historyRes.status === "fulfilled" ? (Array.isArray(historyRes.value) ? historyRes.value : historyRes.value?.history || []) : [];
    const proof = proofRes.status === "fulfilled" ? proofRes.value : null;

    const currentStatus = (item.status || tracking.status || "CREATED").toUpperCase();
    const statusClass = `status-badge status-${currentStatus.toLowerCase()}`;
    const id = item.deliveryid ?? item.id ?? deliveryId;
    const payout = item.payout ? `$${Number(item.payout).toFixed(2)}` : "$18.50";

    // --- 4. STEPPER TIMELINE ---
    const steps = ["CREATED", "CLAIMED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];
    const currentStepIndex = steps.indexOf(currentStatus);

    const stepperNode = createElement("div", { class: "status-stepper" }, 
      steps.map((step, idx) => {
        const isCompleted = idx <= currentStepIndex && currentStatus !== "CANCELLED";
        const stepClass = `stepper-step ${isCompleted ? "completed" : "pending"}`;
        return createElement("span", { class: stepClass }, [step.replace("_", " ")]);
      })
    );

    // --- 5. MAP & LIVE GPS OVERVIEW ---
    const mapContainer = createElement("div", { class: "delivery-live-map" }, [
      createElement("div", { class: "map-content" }, [
        createElement("p", { class: "map-status-text" }, [
          currentStatus === "IN_TRANSIT" 
            ? "🛰️ Live GPS Tracking Active (Courier en route)" 
            : "📍 Route Overview Map"
        ]),
        tracking.current_location 
          ? createElement("span", { class: "map-subtitle" }, [`Current Loc: ${tracking.current_location.lat}, ${tracking.current_location.lng}`])
          : "",
        tracking.eta 
          ? createElement("span", { class: "map-subtitle" }, [`ETA: ${Datex(tracking.eta, true)}`])
          : ""
      ])
    ]);

    // --- 6. ROLE ACTIONS ---
    const actionsContainer = createElement("div", { class: "delivery-card-actions" });

    if (userRole === "courier") {
      if (currentStatus === "AVAILABLE" || currentStatus === "CREATED") {
        actionsContainer.append(
          Button(`Claim Delivery (${payout})`, "btn-claim", {
            click: async () => {
              try {
                await claimDelivery(id);
                Notify("Delivery claimed! Heading to pickup.", { type: "success" });
                displayDelivery(container, deliveryId, options);
              } catch (err) {
                Notify(err?.message || "Failed to claim delivery.", { type: "error" });
              }
            }
          }, "btn-primary")
        );
      } else if (currentStatus === "CLAIMED") {
        actionsContainer.append(
          Button("Mark Package Picked Up", "btn-pickup", {
            click: async () => handleStatusUpdate(id, "PICKED_UP", container, options)
          }, "btn-primary")
        );
      } else if (currentStatus === "PICKED_UP") {
        actionsContainer.append(
          Button("Start Transit to Dropoff", "btn-transit", {
            click: async () => handleStatusUpdate(id, "IN_TRANSIT", container, options)
          }, "btn-primary")
        );
      } else if (currentStatus === "IN_TRANSIT") {
        actionsContainer.append(
          Button("Complete Delivery (Verify OTP)", "btn-complete", {
            click: async () => {
              const otp = prompt("Enter Handover OTP code from recipient:");
              if (otp) {
                await handleStatusUpdate(id, "DELIVERED", container, options, { otp });
              }
            }
          }, "btn-success")
        );
      }
    }

    if (userRole === "sender" && (currentStatus === "CREATED" || currentStatus === "AVAILABLE")) {
      actionsContainer.append(
        Button("Cancel Delivery Order", "btn-cancel-delivery", {
          click: async () => {
            if (confirm("Are you sure you want to cancel this delivery request?")) {
              try {
                await cancelDelivery(id);
                Notify("Delivery cancelled successfully", { type: "success" });
                navigate("/deliveries");
              } catch (err) {
                Notify(err?.message || "Failed to cancel delivery", { type: "error" });
              }
            }
          }
        }, "btn-danger")
      );
    }

    // --- 7. ACTIVITY LOGS ---
    const combinedLogs = [...history, ...events].sort(
      (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
    );

    const historyList = createElement("div", { class: "tracking-history-list" }, 
      combinedLogs.length === 0
        ? [createElement("div", { class: "empty-history" }, ["No status updates recorded yet."])]
        : combinedLogs.map((log) => 
            createElement("div", { class: "history-item" }, [
              createElement("div", { class: "history-timestamp" }, [Datex(log.created_at || log.timestamp || Date.now(), true)]),
              createElement("div", { class: "history-event" }, [log.status || log.event_type || "Event logged"]),
              log.description ? createElement("div", { class: "history-desc" }, [log.description]) : ""
            ])
          )
    );

    // --- 8. PROOF OF DELIVERY ---
    let proofSection = null;
    if (proof?.url) {
      proofSection = createElement("div", { class: "delivery-info-group proof-section" }, [
        createElement("h3", {}, ["Proof of Delivery"]),
        createElement("div", { class: "proof-content" }, [
          createElement("img", {
            src: proof.url,
            alt: "Proof of Delivery",
            class: "proof-image",
            events: { click: () => window.open(proof.url, "_blank") }
          }),
          createElement("div", { class: "proof-details" }, [
            proof.recipient_name ? createElement("p", {}, [createElement("strong", {}, ["Received By: "]), proof.recipient_name]) : "",
            proof.timestamp ? createElement("p", {}, [createElement("strong", {}, ["Signed At: "]), Datex(proof.timestamp, true)]) : ""
          ])
        ])
      ]);
    }

    // --- 9. DETAILS CARD RENDER ---
    const card = createElement("div", { class: "delivery-details-card" }, [
      createElement("div", { class: "delivery-card-header" }, [
        createElement("h2", {}, [`Delivery #${id}`]),
        createElement("span", { class: statusClass }, [currentStatus])
      ]),

      stepperNode,
      mapContainer,

      createElement("div", { class: "delivery-card-body" }, [
        createElement("div", { class: "delivery-info-group" }, [
          createElement("h3", {}, ["Pickup Details"]),
          createElement("p", {}, [createElement("strong", {}, ["Address: "]), item.pickup_loc?.address || "N/A"]),
          createElement("p", {}, [createElement("strong", {}, ["Contact Person: "]), item.pickup_contact || "On site"])
        ]),
        createElement("div", { class: "delivery-info-group" }, [
          createElement("h3", {}, ["Dropoff Details"]),
          createElement("p", {}, [createElement("strong", {}, ["Address: "]), item.dropoff_loc?.address || "N/A"]),
          createElement("p", {}, [createElement("strong", {}, ["Contact Person: "]), item.dropoff_contact || "Recipient"])
        ]),
        createElement("div", { class: "delivery-info-group" }, [
          createElement("h3", {}, ["Logistics & Financials"]),
          createElement("p", {}, [createElement("strong", {}, ["Payout: "]), payout]),
          createElement("p", {}, [createElement("strong", {}, ["Vehicle Req: "]), item.vehicle_type || "Standard"]),
          createElement("p", {}, [createElement("strong", {}, ["Created At: "]), Datex(item.created_at || Date.now(), true)])
        ]),
        createElement("div", { class: "delivery-info-group" }, [
          createElement("h3", {}, ["Handover Security"]),
          createElement("p", {}, [createElement("strong", {}, ["Delivery OTP Code: "]), item.handover_otp || "****"]),
          createElement("p", {}, [createElement("strong", {}, ["Assigned Courier: "]), item.courier_name || (item.courier_id ? `#${item.courier_id}` : "Unassigned")])
        ]),
        proofSection,
        createElement("div", { class: "delivery-info-group activity-history-group" }, [
          createElement("h3", {}, ["Activity & Tracking History"]),
          historyList
        ])
      ].filter(Boolean)),

      actionsContainer
    ]);

    pageWrapper.appendChild(card);
  } catch (err) {
    pageWrapper.replaceChildren(
      createElement("div", { class: "deliveries-error" }, [
        err?.message || "Failed to load delivery details."
      ])
    );
  }
}

async function handleStatusUpdate(deliveryId, newStatus, container, options, extraPayload = {}) {
  try {
    await updateDeliveryStatus(deliveryId, { status: newStatus, ...extraPayload });
    Notify(`Delivery status updated to ${newStatus}`, { type: "success" });
    displayDelivery(container, deliveryId, options);
  } catch (err) {
    Notify(err?.message || `Failed to update status to ${newStatus}`, { type: "error" });
  }
}

export default displayDelivery;