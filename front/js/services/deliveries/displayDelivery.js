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

  // Identify user role from context or local state
  const userRole = options.userRole || localStorage.getItem("user_role") || "courier"; // "courier" | "sender"

  // --- ASIDE & ACTIONS ---
  const asideChildren = [
    Button("← Back to Deliveries", "btn-back-del", { click: () => navigate("/deliveries") }, "buttonx secondary"),
    Button("Create New Delivery", "btn-crt-del", { click: () => navigate("/delivery/create") }, "buttonx primary"),
    adspace("aside", PAGE_NAME, { width: 300, height: 250, refreshInterval: 30000 })
  ];

  const asideContent = createAsideContent({
    title: "Quick Actions",
    children: asideChildren,
    showAd: false
  });

  // --- MAIN LAYOUT SETUP ---
  const mainHeader = [
    createElement("div", { class: "delivery-detail-header-row" }, [
      createElement("h1", {}, [`Delivery Details`])
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
    createElement("div", { class: "deliveries-loading" }, ["Loading delivery details..."])
  ]);

  mainElement.append(pageWrapper);

  try {
    const item = await fetchDeliveryById(deliveryId);
    pageWrapper.replaceChildren();

    const currentStatus = (item.status || "CREATED").toUpperCase();
    const statusClass = `status-badge status-${currentStatus.toLowerCase()}`;
    const id = item.deliveryid ?? item.id ?? deliveryId;
    const payout = item.payout ? `$${Number(item.payout).toFixed(2)}` : "$18.50";

    // --- 1. STATUS STEPPER TIMELINE ---
    const steps = ["CREATED", "CLAIMED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];
    const currentStepIndex = steps.indexOf(currentStatus);

    const stepperNode = createElement("div", { class: "status-stepper", style: "display:flex;justify-content:space-between;margin:20px 0;padding:10px;background:#f8f9fa;border-radius:8px;" }, 
      steps.map((step, idx) => {
        const isCompleted = idx <= currentStepIndex && currentStatus !== "CANCELLED";
        const style = `padding:6px 12px;border-radius:12px;font-size:12px;font-weight:bold;background:${isCompleted ? "#28a745" : "#e0e0e0"};color:${isCompleted ? "#fff" : "#666"};`;
        return createElement("span", { style }, [step.replace("_", " ")]);
      })
    );

    // --- 2. LIVE TRACKING MAP PLACEHOLDER ---
    const mapContainer = createElement("div", {
      class: "delivery-live-map",
      style: "height:280px;background:#e9ecef;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;"
    }, [
      createElement("p", {}, [
        currentStatus === "IN_TRANSIT" 
          ? "🛰️ Live GPS Tracking Active (Courier en route to dropoff)" 
          : "📍 Route Overview Map"
      ])
    ]);

    // --- 3. DYNAMIC ROLE-BASED ACTIONS ---
    const actionsContainer = createElement("div", { class: "delivery-card-actions", style: "display:flex;gap:10px;margin-top:20px;" });

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
            click: async () => {
              await handleStatusUpdate(id, "PICKED_UP", container, options);
            }
          }, "btn-primary")
        );
      } else if (currentStatus === "PICKED_UP") {
        actionsContainer.append(
          Button("Start Transit to Dropoff", "btn-transit", {
            click: async () => {
              await handleStatusUpdate(id, "IN_TRANSIT", container, options);
            }
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

    // Sender Cancel Options
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

    // --- 4. DETAILS CARD RENDER ---
    const card = createElement("div", { class: "delivery-details-card", style: "background:#fff;padding:20px;border-radius:8px;border:1px solid #ddd;" }, [
      createElement("div", { class: "delivery-card-header", style: "display:flex;justify-content:space-between;align-items:center;" }, [
        createElement("h2", {}, [`Delivery #${id}`]),
        createElement("span", { class: statusClass, style: "font-weight:bold;padding:4px 8px;border-radius:4px;" }, [currentStatus])
      ]),

      stepperNode,
      mapContainer,

      createElement("div", { class: "delivery-card-body", style: "display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px;" }, [
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
        ])
      ]),

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

// Internal Status State Transition Helper
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