import { createElement } from "../../components/createElement.js";
import { deliveryStore } from "./DeliveryStore.js";
import { DriverDashboard } from "./DriverDashboard.js";
import { AvailableDeliveriesPage } from "./AvailableDeliveriesPage.js";
import { DeliveryDetailsPage } from "./DeliveryDetailsPage.js";
import { DeliveryProgressPage } from "./DeliveryProgressPage.js";
import { DeliveryHistoryPage } from "./DeliveryHistoryPage.js";
import { MerchantDashboard } from "./MerchantDashboard.js";

export async function displayDeliveries(contentContainer, isLoggedIn) {
  contentContainer.replaceChildren();

  await deliveryStore.loadDeliveries();

  let currentTab = "driver"; // 'driver' | 'merchant' | 'history'
  let selectedDeliveryId = null;

  const shell = createElement("div", {
    class: "delivery-shell",
    style: { maxWidth: "1200px", margin: "20px auto", padding: "0 16px" }
  });

  function renderHeader() {
    const navButtons = [
      { id: "driver", label: "Driver Portal" },
      { id: "merchant", label: "Merchant Dashboard" },
      { id: "history", label: "History" }
    ];

    return createElement("header", { style: { marginBottom: "24px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" } }, [
      createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
        createElement("div", {}, [
          createElement("h1", { textContent: "Delivery Management", style: { margin: "0 0 4px 0", fontSize: "1.75rem" } }),
          createElement("p", { textContent: isLoggedIn ? "Manage active orders, drivers, and route fulfillment." : "Sign in to access live controls.", style: { margin: 0, color: "#64748b" } })
        ]),
        createElement("nav", { style: { display: "flex", gap: "8px" } }, 
          navButtons.map((btn) =>
            createElement("button", {
              textContent: btn.label,
              class: `btn ${currentTab === btn.id ? "btn-primary" : "btn-secondary"}`,
              events: {
                click() {
                  currentTab = btn.id;
                  selectedDeliveryId = null;
                  update();
                }
              }
            })
          )
        )
      ])
    ]);
  }

  function renderBody(deliveries) {
    if (selectedDeliveryId) {
      const activeItem = deliveries.find((d) => d.id === selectedDeliveryId);
      if (!activeItem) {
        selectedDeliveryId = null;
        return renderBody(deliveries);
      }

      return createElement("div", {}, [
        createElement("button", {
          textContent: "← Back to list",
          class: "btn btn-secondary",
          style: { marginBottom: "16px" },
          events: { click: () => { selectedDeliveryId = null; update(); } }
        }),
        activeItem.status === "Pending"
          ? DeliveryDetailsPage({
              delivery: activeItem,
              onBack: () => { selectedDeliveryId = null; update(); },
              onAccept: (item) => {
                deliveryStore.updateStatus(item.id, "Accepted");
                update();
              }
            })
          : DeliveryProgressPage({
              delivery: activeItem,
              onStatusChange: (newStatus, item) => {
                deliveryStore.updateStatus(item.id, newStatus);
              },
              onCancel: (item) => {
                deliveryStore.updateStatus(item.id, "Cancelled");
                selectedDeliveryId = null;
                update();
              }
            })
      ]);
    }

    if (currentTab === "driver") {
      const available = deliveries.filter((d) => d.status === "Pending");
      const active = deliveries.filter((d) => ["Accepted", "In Transit"].includes(d.status));

      return createElement("div", { style: { display: "flex", flexDirection: "column", gap: "32px" } }, [
        DriverDashboard({
          driver: { name: "Alex", vehicle: "Honda Activa" },
          stats: { earnings: 860, completed: deliveries.filter((d) => d.status === "Delivered").length, available: available.length, rating: "4.9 ★" }
        }),
        AvailableDeliveriesPage({
          deliveries: available,
          onView: (item) => { selectedDeliveryId = item.id; update(); },
          onAccept: (item) => { deliveryStore.updateStatus(item.id, "Accepted"); update(); }
        }),
        ...(active.length ? [
          createElement("div", { class: "card", style: { padding: "20px", border: "1px solid #cbd5e1", borderRadius: "8px" } }, [
            createElement("h3", { textContent: "Active Mission in Progress", style: { margin: "0 0 12px 0" } }),
            ...active.map((item) =>
              createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" } }, [
                createElement("span", { textContent: `${item.id} — ${item.pickup} → ${item.dropoff}` }),
                createElement("button", {
                  textContent: "Track Mission",
                  class: "btn btn-primary",
                  events: { click: () => { selectedDeliveryId = item.id; update(); } }
                })
              ])
            )
          ])
        ] : [])
      ]);
    }

    if (currentTab === "merchant") {
      return MerchantDashboard({
        merchant: { name: "ABC Electronics", email: "orders@example.com" },
        stats: {
          active: deliveries.filter((d) => d.status !== "Delivered" && d.status !== "Cancelled").length,
          delivered: deliveries.filter((d) => d.status === "Delivered").length,
          cancelled: deliveries.filter((d) => d.status === "Cancelled").length,
          revenue: 25480
        },
        activeDeliveries: deliveries.filter((d) => d.status !== "Delivered"),
        onViewDelivery: (item) => { selectedDeliveryId = item.id; update(); }
      });
    }

    return DeliveryHistoryPage({
      deliveries: deliveries.filter((d) => d.status === "Delivered"),
      onView: (item) => { selectedDeliveryId = item.id; update(); },
      onBack: () => { currentTab = "driver"; update(); }
    });
  }

  function update() {
    const currentDeliveries = deliveryStore.deliveries;
    shell.replaceChildren(renderHeader(), renderBody(currentDeliveries));
  }

  deliveryStore.subscribe(() => update());
  shell.appendChild(renderHeader());
  shell.appendChild(renderBody(deliveryStore.deliveries));
  contentContainer.appendChild(shell);
}

export async function displayDelivery(contentContainer, deliveryid, isLoggedIn) {
  contentContainer.replaceChildren();
  await deliveryStore.loadDeliveries();

  const item = deliveryStore.deliveries.find((d) => String(d.id) === String(deliveryid)) || deliveryStore.deliveries[0];

  const page = createElement("div", { style: { maxWidth: "1000px", margin: "20px auto", padding: "0 16px" } }, [
    DeliveryProgressPage({
      delivery: item,
      onStatusChange: (status) => deliveryStore.updateStatus(item.id, status)
    })
  ]);

  contentContainer.appendChild(page);
}