import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";
import Modal from "../../components/ui/Modal.mjs";
import { fetchAllDeliveries } from "./deliveriesApi.js";
import { navigate } from "../../routes/index.js";

export async function displaydeliveries(contentContainer, isLoggedIn) {
  contentContainer.innerHTML = "";

  // Render Header Bar
  const header = createElement("div", { class: "deliveries-header" }, [
    createElement("h1", { class: "deliveries-title" }, ["Deliveries & Shipments"]),
    isLoggedIn ? Button("Create New Delivery", "btn-create-delivery", {
      click: () => { navigate("/delivery/create"); }
    }, "btn-primary") : null
  ]);

  const listContainer = createElement("div", { class: "deliveries-list-container" }, [
    createElement("div", { class: "deliveries-loading" }, ["Loading shipments..."])
  ]);

  contentContainer.appendChild(header);
  contentContainer.appendChild(listContainer);

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
      const statusClass = `status-badge status-${(item.status || "pending").toLowerCase()}`;
      
      const card = createElement("div", { class: "delivery-card" }, [
        createElement("div", { class: "delivery-card-header" }, [
          createElement("span", { class: "delivery-id" }, [`ID: ${item.deliveryid || item._id}`]),
          createElement("span", { class: statusClass }, [item.status || "Pending"])
        ]),
        createElement("div", { class: "delivery-card-body" }, [
          createElement("div", { class: "delivery-info-row" }, [
            createElement("strong", {}, ["Recipient: "]),
            item.recipientName || "N/A"
          ]),
          createElement("div", { class: "delivery-info-row" }, [
            createElement("strong", {}, ["Destination: "]),
            item.destination || "N/A"
          ]),
          createElement("div", { class: "delivery-info-row" }, [
            createElement("strong", {}, ["Created: "]),
            Datex(item.createdAt || Date.now(), false)
          ])
        ]),
        createElement("div", { class: "delivery-card-actions" }, [
          Button("View Details", "", {
            click: () => {
              const targetId = item.deliveryid || item._id;
              navigate(`delivery/${targetId}`);
            }
          }, "btn-secondary")
        ])
      ]);

      grid.appendChild(card);
    });

    listContainer.appendChild(grid);

  } catch (err) {
    listContainer.innerHTML = "";
    listContainer.appendChild(
      createElement("div", { class: "deliveries-error" }, ["Failed to load delivery records."])
    );
  }
}