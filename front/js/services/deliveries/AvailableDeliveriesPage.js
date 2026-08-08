import { createElement } from "../../components/createElement.js";

export function AvailableDeliveriesPage({ deliveries = [], onAccept = () => {}, onView = () => {} } = {}) {
  const listContainer = createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } });
  const emptyState = createElement("div", { style: { padding: "32px", textAlign: "center", color: "#64748b" } }, [
    createElement("p", { textContent: "No available delivery missions near you." })
  ]);

  const searchInput = createElement("input", {
    type: "search",
    placeholder: "Filter by location or ID…",
    class: "delivery-search",
    style: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }
  });

  function render(items) {
    listContainer.replaceChildren();
    if (!items.length) {
      listContainer.appendChild(emptyState);
      return;
    }

    items.forEach((item) => {
      const card = createElement("div", {
        class: "card",
        style: { padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }
      }, [
        createElement("div", {}, [
          createElement("strong", { textContent: `${item.id} — ₹${item.reward}` }),
          createElement("p", { textContent: `${item.pickup} ➔ ${item.dropoff}`, style: { margin: "4px 0 0 0", color: "#475569" } })
        ]),
        createElement("div", { style: { display: "flex", gap: "8px" } }, [
          createElement("button", {
            textContent: "Details",
            class: "btn btn-secondary",
            events: { click: () => onView(item) }
          }),
          createElement("button", {
            textContent: "Accept Job",
            class: "btn btn-primary",
            events: { click: () => onAccept(item) }
          })
        ])
      ]);
      listContainer.appendChild(card);
    });
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    render(deliveries.filter((d) => d.id.toLowerCase().includes(query) || d.pickup.toLowerCase().includes(query) || d.dropoff.toLowerCase().includes(query)));
  });

  render(deliveries);

  return createElement("section", {}, [
    createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } }, [
      createElement("h2", { textContent: `Available Missions (${deliveries.length})`, style: { margin: 0 } }),
      searchInput
    ]),
    listContainer
  ]);
}