import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";
import { fetchDeliveryById, cancelDelivery } from "../../services/deliveries/deliveriesApi.js";
import { navigate } from "../../routes/index.js";

export async function displayDelivery(container, deliveryId) {
  if (!container || !container.nodeType) {
    console.error("displayDelivery: Missing DOM container element.");
    return;
  }

  container.innerHTML = "";

  const pageWrapper = createElement("div", { class: "delivery-details-container" }, [
    createElement("button", {
      class: "back-link",
      events: { click: () => navigate("/deliveries") }
    }, ["← Back to Deliveries"]),
    createElement("div", { class: "deliveries-loading" }, ["Loading delivery details..."])
  ]);

  container.appendChild(pageWrapper);

  try {
    const item = await fetchDeliveryById(deliveryId);
    pageWrapper.innerHTML = "";

    const statusClass = `status-badge status-${(item.status || "created").toLowerCase()}`;

    const card = createElement("div", { class: "delivery-details-card" }, [
      createElement("div", { class: "delivery-card-header" }, [
        createElement("h2", {}, [`Delivery #${item.deliveryid ?? item.id}`]),
        createElement("span", { class: statusClass }, [item.status || "CREATED"])
      ]),
      createElement("div", { class: "delivery-card-body" }, [
        createElement("div", { class: "delivery-info-row" }, [
          createElement("strong", {}, ["Pickup Address: "]),
          item.pickup_loc?.address || "N/A"
        ]),
        createElement("div", { class: "delivery-info-row" }, [
          createElement("strong", {}, ["Dropoff Address: "]),
          item.dropoff_loc?.address || "N/A"
        ]),
        createElement("div", { class: "delivery-info-row" }, [
          createElement("strong", {}, ["Created At: "]),
          Datex(item.created_at || Date.now(), false)
        ])
      ]),
      createElement("div", { class: "delivery-card-actions" }, [
        Button("Cancel Delivery", "btn-cancel-delivery", {
          click: async () => {
            if (confirm("Are you sure you want to cancel this delivery?")) {
              try {
                await cancelDelivery(deliveryId);
                Notify("Delivery cancelled successfully", { type: "success" });
                navigate("/deliveries");
              } catch (err) {
                Notify(err?.message || "Failed to cancel delivery", { type: "error" });
              }
            }
          }
        }, "btn-danger")
      ])
    ]);

    pageWrapper.appendChild(card);
  } catch (err) {
    pageWrapper.innerHTML = "";
    pageWrapper.appendChild(
      createElement("div", { class: "deliveries-error" }, [
        err?.message || "Failed to load delivery details."
      ])
    );
  }
}

export default displayDelivery;