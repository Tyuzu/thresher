import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";
import Modal from "../../components/ui/Modal.mjs";
import { fetchDeliveryById, updateDeliveryStatus } from "./deliveriesApi.js";

export async function displaydelivery(isLoggedIn, deliveryid, contentContainer) {
  contentContainer.innerHTML = "";

  const container = createElement("div", { class: "delivery-detail-container" }, [
    createElement("div", { class: "delivery-loading" }, ["Fetching shipment details..."])
  ]);
  contentContainer.appendChild(container);

  try {
    const item = await fetchDeliveryById(deliveryid);
    container.innerHTML = "";

    const statusBadge = createElement("span", { 
      class: `status-badge status-${(item.status || "pending").toLowerCase()}` 
    }, [item.status || "Pending"]);

    const header = createElement("div", { class: "detail-header" }, [
      createElement("div", {}, [
        createElement("button", {
          class: "back-link",
          events: { click: () => history.back() }
        }, ["← Back to Deliveries"]),
        createElement("h2", { class: "detail-title" }, [`Shipment #${item.deliveryid || deliveryid}`])
      ]),
      statusBadge
    ]);

    const trackingTimeline = createElement("div", { class: "tracking-timeline" }, 
      (item.history || []).map((step) => 
        createElement("div", { class: "timeline-step" }, [
          createElement("div", { class: "step-marker" }),
          createElement("div", { class: "step-content" }, [
            createElement("h4", {}, [step.status]),
            createElement("p", {}, [step.description || ""]),
            createElement("small", {}, [Datex(step.timestamp, true)])
          ])
        ])
      )
    );

    const infoGrid = createElement("div", { class: "detail-grid" }, [
      createElement("div", { class: "detail-box" }, [
        createElement("h3", {}, ["Delivery Information"]),
        createElement("p", {}, [createElement("strong", {}, ["Recipient: "]), item.recipientName || "N/A"]),
        createElement("p", {}, [createElement("strong", {}, ["Address: "]), item.address || "N/A"]),
        createElement("p", {}, [createElement("strong", {}, ["Phone: "]), item.phone || "N/A"])
      ]),
      createElement("div", { class: "detail-box" }, [
        createElement("h3", {}, ["Package Details"]),
        createElement("p", {}, [createElement("strong", {}, ["Weight: "]), item.weight ? `${item.weight} kg` : "N/A"]),
        createElement("p", {}, [createElement("strong", {}, ["Type: "]), item.packageType || "Standard"]),
        createElement("p", {}, [createElement("strong", {}, ["Est. Delivery: "]), Datex(item.estimatedDelivery, false)])
      ])
    ]);

    // Admin/Driver status controls
    const actionsContainer = createElement("div", { class: "detail-actions" });
    if (isLoggedIn) {
      const updateBtn = Button("Update Status", "btn-update-status", {
        click: () => openStatusModal(item.deliveryid || deliveryid, item.status, statusBadge)
      }, "btn-primary");
      actionsContainer.appendChild(updateBtn);
    }

    container.appendChild(header);
    container.appendChild(infoGrid);
    if ((item.history || []).length > 0) {
      container.appendChild(createElement("h3", { class: "timeline-heading" }, ["Tracking History"]));
      container.appendChild(trackingTimeline);
    }
    container.appendChild(actionsContainer);

  } catch (err) {
    container.innerHTML = "";
    container.appendChild(
      createElement("div", { class: "delivery-error" }, [
        createElement("h3", {}, ["Error Loading Shipment"]),
        createElement("p", {}, [err?.message || "The requested delivery could not be found."])
      ])
    );
  }
}

function openStatusModal(deliveryId, currentStatus, statusBadgeEl) {
  let selectedStatus = currentStatus;

  Modal({
    title: "Update Shipment Status",
    size: "small",
    content: () => {
      const select = createElement("select", {
        class: "modal-select-status",
        events: {
          change: (e) => { selectedStatus = e.target.value; }
        }
      }, [
        createElement("option", { value: "Pending", selected: currentStatus === "Pending" }, ["Pending"]),
        createElement("option", { value: "In Transit", selected: currentStatus === "In Transit" }, ["In Transit"]),
        createElement("option", { value: "Out for Delivery", selected: currentStatus === "Out for Delivery" }, ["Out for Delivery"]),
        createElement("option", { value: "Delivered", selected: currentStatus === "Delivered" }, ["Delivered"]),
        createElement("option", { value: "Cancelled", selected: currentStatus === "Cancelled" }, ["Cancelled"])
      ]);

      return createElement("div", { class: "status-modal-body" }, [
        createElement("p", {}, ["Select new status for shipment:"]),
        select
      ]);
    },
    actions: () => {
      return createElement("div", { class: "modal-actions-right" }, [
        Button("Save Changes", "btn-save-status", {
          click: async () => {
            try {
              await updateDeliveryStatus(deliveryId, selectedStatus);
              statusBadgeEl.textContent = selectedStatus;
              statusBadgeEl.className = `status-badge status-${selectedStatus.toLowerCase().replace(/\s+/g, "-")}`;
              Notify("Status updated successfully", { type: "success" });
            } catch (err) {
              Notify(err.message || "Failed to update status", { type: "error" });
            }
          }
        }, "btn-primary")
      ]);
    }
  });
}