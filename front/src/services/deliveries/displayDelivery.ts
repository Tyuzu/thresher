import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.js";
import { navigate } from "../../routes/navigate.js";
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

// Interface definitions
interface DeliveryLocation {
  address?: string;
}

interface CurrentLocation {
  lat?: number | string;
  lng?: number | string;
  [key: string]: any;
}

interface DeliveryItem {
  deliveryid?: string | number;
  id?: string | number;
  status?: string;
  payout?: number | string;
  pickup_loc?: DeliveryLocation;
  pickup_contact?: string;
  dropoff_loc?: DeliveryLocation;
  dropoff_contact?: string;
  vehicle_type?: string;
  created_at?: string | number;
  handover_otp?: string;
  courier_name?: string;
  courier_id?: string | number;
  [key: string]: any;
}

interface DeliveryTracking {
  status?: string;
  eta?: string | number;
  current_location?: CurrentLocation;
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
  [key: string]: any;
}

interface DisplayDeliveryOptions {
  userRole?: string;
  [key: string]: any;
}

export async function displayDelivery(
  container: HTMLElement | null,
  deliveryId: string | number,
  options: DisplayDeliveryOptions = {}
): Promise<void> {
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
  const actionButtons = [
    Button({
      title: "← Back to Deliveries",
      id: "btn-back-del",
      events: { click: () => navigate("/deliveries") },
      classes: "buttonx secondary"
    })
  ];

  if (userRole === "sender") {
    actionButtons.push(
      Button({
        title: "Create New Delivery",
        id: "btn-crt-del",
        events: { click: () => navigate("/delivery/create") },
        classes: "buttonx primary"
      })
    );
  }

  actionButtons.push(
    Button({
      title: "Refresh View",
      id: "btn-refresh-del",
      events: { click: () => displayDelivery(container, deliveryId, options) },
      classes: "buttonx primary"
    })
  );

  const actionsWrapper = createElement("div", { class: "aside-actions-group" }, actionButtons);

  const sidebarAd = adspace("aside", PAGE_NAME, {
    layout: "vertical",
    width: 300,
    height: 250,
    refreshInterval: 30000
  });

  const asideContent = createAsideContent({
    title: "Delivery Actions",
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

  // --- 2. MAIN LAYOUT HEADER ---
  const mainHeader = [
    createElement("header", { class: "delivery-detail-header-row" }, [
      createElement("h1", {}, [`Delivery Tracking & Details - Order #${deliveryId}`])
    ]),
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal", width: 728, height: 90, refreshInterval: 45000
    })
  ];

  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "delivery-detail-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector("main") || layout.querySelector(".layout-main");

  if (!mainElement) {
    console.error("displayDelivery: Main layout container element missing.");
    return;
  }

  const pageWrapper = createElement("div", { class: "delivery-details-container" }, [
    createElement("div", { class: "deliveries-loading", role: "status", "aria-live": "polite" }, [
      "Fetching delivery details and live tracking..."
    ])
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

    const item: DeliveryItem = itemRes.status === "fulfilled" ? itemRes.value : {};
    const tracking: DeliveryTracking = trackingRes.status === "fulfilled" ? trackingRes.value : {};
    
    const eventsVal: any = eventsRes.status === "fulfilled" ? eventsRes.value : [];
    const events: DeliveryEvent[] = Array.isArray(eventsVal) ? eventsVal : eventsVal?.events || [];
    
    const historyVal: any = historyRes.status === "fulfilled" ? historyRes.value : [];
    const history: DeliveryEvent[] = Array.isArray(historyVal) ? historyVal : historyVal?.history || [];
    
    const proof: ProofOfDelivery | null = proofRes.status === "fulfilled" ? proofRes.value : null;

    const currentStatus = (item.status || tracking.status || "CREATED").toUpperCase();
    const statusClass = `status-badge status-${currentStatus.toLowerCase()}`;
    const id = item.deliveryid ?? item.id ?? deliveryId;
    const payout = item.payout ? `$${Number(item.payout).toFixed(2)}` : "$18.50";

    // --- 4. STEPPER TIMELINE ---
    const steps = ["CREATED", "CLAIMED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];
    const currentStepIndex = steps.indexOf(currentStatus);

    const stepperNode = createElement("nav", {
      class: "status-stepper-nav",
      "aria-label": "Delivery progress"
    }, [
      createElement("ol", { class: "status-stepper" },
        steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIndex && currentStatus !== "CANCELLED";
          const isCurrent = idx === currentStepIndex && currentStatus !== "CANCELLED";
          const stepClass = `stepper-step ${isCompleted ? "completed" : "pending"}`;

          const stepAttrs: Record<string, any> = { class: stepClass };
          if (isCurrent) stepAttrs["aria-current"] = "step";

          return createElement("li", stepAttrs, [
            createElement("span", { class: "step-label" }, [step.replace("_", " ")])
          ]);
        })
      )
    ]);

    // --- 5. MAP & LIVE GPS OVERVIEW ---
    const etaDate = tracking.eta ? new Date(tracking.eta) : null;
    const mapContainer = createElement("section", {
      class: "delivery-live-map",
      "aria-label": "Live GPS tracking and map"
    }, [
      createElement("div", { class: "map-content" }, [
        createElement("p", { class: "map-status-text" }, [
          currentStatus === "IN_TRANSIT"
            ? "🛰️ Live GPS Tracking Active (Courier en route)"
            : "📍 Route Overview Map"
        ]),
        tracking.current_location
          ? createElement("p", { class: "map-subtitle" }, [
              "Current Loc: ",
              createElement("span", { class: "coordinates" }, [`${tracking.current_location.lat}, ${tracking.current_location.lng}`])
            ])
          : "",
        etaDate
          ? createElement("p", { class: "map-subtitle" }, [
              "ETA: ",
              createElement("time", { datetime: etaDate.toISOString() }, [Datex(tracking.eta, true)])
            ])
          : ""
      ].filter(Boolean))
    ]);

    // --- 6. ROLE ACTIONS ---
    const actionsContainer = createElement("footer", { class: "delivery-card-actions" });

    if (userRole === "courier") {
      if (currentStatus === "AVAILABLE" || currentStatus === "CREATED") {
        const claimBtn = Button({
          title: `Claim Delivery (${payout})`,
          id: "btn-claim",
          events: {
            click: async () => {
              try {
                await claimDelivery(id);
                Notify("Delivery claimed! Heading to pickup.", { type: "success" });
                displayDelivery(container, deliveryId, options);
              } catch (err: any) {
                Notify(err?.message || "Failed to claim delivery.", { type: "error" });
              }
            }
          },
          classes: "btn-primary"
        });
        claimBtn.setAttribute("aria-label", `Claim delivery #${id} for ${payout}`);
        actionsContainer.append(claimBtn);
      } else if (currentStatus === "CLAIMED") {
        const pickupBtn = Button({
          title: "Mark Package Picked Up",
          id: "btn-pickup",
          events: {
            click: async () => handleStatusUpdate(id, "PICKED_UP", container, options)
          },
          classes: "btn-primary"
        });
        pickupBtn.setAttribute("aria-label", `Mark package for delivery #${id} as picked up`);
        actionsContainer.append(pickupBtn);
      } else if (currentStatus === "PICKED_UP") {
        const transitBtn = Button({
          title: "Start Transit to Dropoff",
          id: "btn-transit",
          events: {
            click: async () => handleStatusUpdate(id, "IN_TRANSIT", container, options)
          },
          classes: "btn-primary"
        });
        transitBtn.setAttribute("aria-label", `Start transit for delivery #${id}`);
        actionsContainer.append(transitBtn);
      } else if (currentStatus === "IN_TRANSIT") {
        const completeBtn = Button({
          title: "Complete Delivery (Verify OTP)",
          id: "btn-complete",
          events: {
            click: async () => {
              const otp = prompt("Enter Handover OTP code from recipient:");
              if (otp) {
                await handleStatusUpdate(id, "DELIVERED", container, options, { otp });
              }
            }
          },
          classes: "btn-success"
        });
        completeBtn.setAttribute("aria-label", `Complete delivery #${id} with handover OTP`);
        actionsContainer.append(completeBtn);
      }
    }

    if (userRole === "sender" && (currentStatus === "CREATED" || currentStatus === "AVAILABLE")) {
      const cancelBtn = Button({
        title: "Cancel Delivery Order",
        id: "btn-cancel-delivery",
        events: {
          click: async () => {
            if (confirm("Are you sure you want to cancel this delivery request?")) {
              try {
                await cancelDelivery(id);
                Notify("Delivery cancelled successfully", { type: "success" });
                navigate("/deliveries");
              } catch (err: any) {
                Notify(err?.message || "Failed to cancel delivery", { type: "error" });
              }
            }
          }
        },
        classes: "btn-danger"
      });
      cancelBtn.setAttribute("aria-label", `Cancel delivery order #${id}`);
      actionsContainer.append(cancelBtn);
    }

    // --- 7. ACTIVITY LOGS ---
    const combinedLogs = [...history, ...events].sort(
      (a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime()
    );

    const historyList = createElement("ol", { class: "tracking-history-list" },
      combinedLogs.length === 0
        ? [createElement("li", { class: "empty-history" }, ["No status updates recorded yet."])]
        : combinedLogs.map((log) => {
            const rawTimestamp = log.created_at || log.timestamp || Date.now();
            const logDate = new Date(rawTimestamp);

            return createElement("li", { class: "history-item" }, [
              createElement("div", { class: "history-timestamp" }, [
                createElement("time", { datetime: logDate.toISOString() }, [Datex(rawTimestamp, true)])
              ]),
              createElement("div", { class: "history-event" }, [log.status || log.event_type || "Event logged"]),
              log.description ? createElement("div", { class: "history-desc" }, [log.description]) : ""
            ].filter(Boolean));
          })
    );

    // --- 8. PROOF OF DELIVERY ---
    let proofSection: HTMLElement | null = null;
    if (proof?.url) {
      const proofDate = proof.timestamp ? new Date(proof.timestamp) : null;

      proofSection = createElement("section", {
        class: "delivery-info-group proof-section",
        "aria-labelledby": `proof-heading-${id}`
      }, [
        createElement("h3", { id: `proof-heading-${id}` }, ["Proof of Delivery"]),
        createElement("figure", { class: "proof-content" }, [
          Button({
            title: "",
            classes: "proof-image-btn",
            events: { click: () => window.open(proof.url, "_blank") },
            "aria-label": "Open proof of delivery photo in new tab",
            type: "button"
          }), // Alternative wrapper or image tag handled below via children pattern structure
          createElement("figcaption", { class: "proof-details" }, [
            proof.recipient_name
              ? createElement("p", {}, [createElement("strong", {}, ["Received By: "]), proof.recipient_name])
              : "",
            proofDate
              ? createElement("p", {}, [
                  createElement("strong", {}, ["Signed At: "]),
                  createElement("time", { datetime: proofDate.toISOString() }, [Datex(proof.timestamp, true)])
                ])
              : ""
          ].filter(Boolean))
        ])
      ]);
      
      // Fix proof image node injection inside figure properly matching original structure
      const figureEl = proofSection.querySelector("figure");
      if (figureEl) {
        const imgBtn = createElement("button", {
          type: "button",
          class: "proof-image-btn",
          "aria-label": "Open proof of delivery photo in new tab",
          events: { click: () => window.open(proof.url, "_blank") }
        }, [
          createElement("img", {
            src: proof.url,
            alt: `Proof of Delivery photograph for order #${id}`,
            class: "proof-image"
          })
        ]);
        figureEl.prepend(imgBtn);
      }
    }

    // --- 9. DETAILS CARD RENDER ---
    const createdAtDate = item.created_at ? new Date(item.created_at) : new Date();

    const card = createElement("article", {
      class: "delivery-details-card",
      "aria-labelledby": `delivery-title-${id}`
    }, [
      createElement("header", { class: "delivery-card-header" }, [
        createElement("h2", { id: `delivery-title-${id}` }, [`Delivery #${id}`]),
        createElement("span", { class: statusClass }, [currentStatus])
      ]),

      stepperNode,
      mapContainer,

      createElement("div", { class: "delivery-card-body" }, [
        createElement("section", { class: "delivery-info-group", "aria-labelledby": `pickup-heading-${id}` }, [
          createElement("h3", { id: `pickup-heading-${id}` }, ["Pickup Details"]),
          createElement("p", {}, [
            createElement("strong", {}, ["Address: "]),
            createElement("address", { class: "address-inline" }, [item.pickup_loc?.address || "N/A"])
          ]),
          createElement("p", {}, [createElement("strong", {}, ["Contact Person: "]), item.pickup_contact || "On site"])
        ]),

        createElement("section", { class: "delivery-info-group", "aria-labelledby": `dropoff-heading-${id}` }, [
          createElement("h3", { id: `dropoff-heading-${id}` }, ["Dropoff Details"]),
          createElement("p", {}, [
            createElement("strong", {}, ["Address: "]),
            createElement("address", { class: "address-inline" }, [item.dropoff_loc?.address || "N/A"])
          ]),
          createElement("p", {}, [createElement("strong", {}, ["Contact Person: "]), item.dropoff_contact || "Recipient"])
        ]),

        createElement("section", { class: "delivery-info-group", "aria-labelledby": `financials-heading-${id}` }, [
          createElement("h3", { id: `financials-heading-${id}` }, ["Logistics & Financials"]),
          createElement("p", {}, [createElement("strong", {}, ["Payout: "]), payout]),
          createElement("p", {}, [createElement("strong", {}, ["Vehicle Req: "]), item.vehicle_type || "Standard"]),
          createElement("p", {}, [
            createElement("strong", {}, ["Created At: "]),
            createElement("time", { datetime: createdAtDate.toISOString() }, [Datex(item.created_at || Date.now(), true)])
          ])
        ]),

        createElement("section", { class: "delivery-info-group", "aria-labelledby": `security-heading-${id}` }, [
          createElement("h3", { id: `security-heading-${id}` }, ["Handover Security"]),
          createElement("p", {}, [createElement("strong", {}, ["Delivery OTP Code: "]), item.handover_otp || "****"]),
          createElement("p", {}, [createElement("strong", {}, ["Assigned Courier: "]), item.courier_name || (item.courier_id ? `#${item.courier_id}` : "Unassigned")])
        ]),

        proofSection,

        createElement("section", { class: "delivery-info-group activity-history-group", "aria-labelledby": `activity-heading-${id}` }, [
          createElement("h3", { id: `activity-heading-${id}` }, ["Activity & Tracking History"]),
          historyList
        ])
      ].filter(Boolean)),

      actionsContainer
    ]);

    pageWrapper.appendChild(card);
  } catch (err: any) {
    pageWrapper.replaceChildren(
      createElement("div", { class: "deliveries-error", role: "alert" }, [
        err?.message || "Failed to load delivery details."
      ])
    );
  }
}

async function handleStatusUpdate(
  deliveryId: string | number,
  newStatus: string,
  container: HTMLElement | null,
  options: DisplayDeliveryOptions,
  extraPayload: Record<string, any> = {}
): Promise<void> {
  try {
    await updateDeliveryStatus(deliveryId, { status: newStatus, ...extraPayload });
    Notify(`Delivery status updated to ${newStatus}`, { type: "success" });
    displayDelivery(container, deliveryId, options);
  } catch (err: any) {
    Notify(err?.message || `Failed to update status to ${newStatus}`, { type: "error" });
  }
}

export default displayDelivery;