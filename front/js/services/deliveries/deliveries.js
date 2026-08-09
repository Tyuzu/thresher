import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import { fetchAllDeliveries } from "../../services/deliveries/deliveriesApi.js";
import { navigate } from "../../routes/index.js";

export async function displayDeliveries(container, isLoggedIn = false) {
  if (!container || !container.nodeType) {
    console.error("displayDeliveries: Missing DOM container element.");
    return;
  }

  container.innerHTML = "";

  const headerChildren = [
    createElement("h1", { class: "deliveries-title" }, ["Deliveries & Shipments"])
  ];

  if (isLoggedIn) {
    headerChildren.push(
      Button("Create New Delivery", "btn-create-delivery", {
        click: () => { navigate("/delivery/create"); }
      }, "btn-primary")
    );
  }

  const header = createElement("div", { class: "deliveries-header" }, headerChildren);

  const listContainer = createElement("div", { class: "deliveries-list-container" }, [
    createElement("div", { class: "deliveries-loading" }, ["Loading shipments..."])
  ]);

  container.appendChild(header);
  container.appendChild(listContainer);

  try {
    const data = await fetchAllDeliveries();
    const deliveries = Array.isArray(data) ? data : data?.deliveries || [];
    listContainer.innerHTML = "";

    if (deliveries.length === 0) {
      listContainer.appendChild(
        createElement("div", { class: "deliveries-empty" }, ["No active deliveries found."])
      );
      return;
    }

    const grid = createElement("div", { class: "deliveries-grid" });

    deliveries.forEach((item) => {
      const statusClass = `status-badge status-${(item.status || "created").toLowerCase()}`;
      const deliveryId = item.deliveryid ?? item.id ?? "N/A";
      
      const card = createElement("div", { class: "delivery-card" }, [
        createElement("div", { class: "delivery-card-header" }, [
          createElement("span", { class: "delivery-id" }, [`ID: ${deliveryId}`]),
          createElement("span", { class: statusClass }, [item.status || "CREATED"])
        ]),
        createElement("div", { class: "delivery-card-body" }, [
          createElement("div", { class: "delivery-info-row" }, [
            createElement("strong", {}, ["Pickup: "]),
            item.pickup_loc?.address || "N/A"
          ]),
          createElement("div", { class: "delivery-info-row" }, [
            createElement("strong", {}, ["Destination: "]),
            item.dropoff_loc?.address || "N/A"
          ]),
          createElement("div", { class: "delivery-info-row" }, [
            createElement("strong", {}, ["Created: "]),
            Datex(item.created_at || Date.now(), false)
          ])
        ]),
        createElement("div", { class: "delivery-card-actions" }, [
          Button("View Details", "", {
            click: () => { navigate(`/delivery/${deliveryId}`); }
          }, "btn-secondary")
        ])
      ]);

      grid.appendChild(card);
    });

    listContainer.appendChild(grid);

  } catch (err) {
    listContainer.innerHTML = "";
    listContainer.appendChild(
      createElement("div", { class: "deliveries-error" }, [
        err?.message || "Failed to load delivery records."
      ])
    );
  }
}

export const Deliveries = displayDeliveries;