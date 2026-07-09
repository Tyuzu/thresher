import { createElement } from "../../components/createElement.js";
import { DeliveryCard } from "./components/DeliveryCard.js";

function AvailableDeliveriesPage({
    deliveries = [],
    onAccept = () => {},
    onView = () => {}
} = {}) {

    const searchInput = createElement("input", {
        type: "search",
        placeholder: "Search by ID, pickup or destination...",
        class: "delivery-search"
    });

    const emptyState = createElement("div", {
        class: "delivery-empty",
        style: {
            display: "none",
            padding: "40px",
            textAlign: "center",
            color: "#666"
        }
    }, [
        createElement("h3", {
            textContent: "No deliveries found"
        }),
        createElement("p", {
            textContent: "Try changing your search."
        })
    ]);

    const listContainer = createElement("div", {
        class: "delivery-list",
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "16px"
        }
    });

    function createCard(delivery) {

        const card = DeliveryCard(delivery, {
            showButton: false
        });

        const actions = createElement("div", {
            style: {
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px"
            }
        }, [

            createElement("button", {
                textContent: "View Details",
                class: "btn btn-secondary",
                events: {
                    click() {
                        onView(delivery);
                    }
                }
            }),

            createElement("button", {
                textContent: "Accept Delivery",
                class: "btn btn-primary",
                events: {
                    click() {
                        onAccept(delivery);
                    }
                }
            })

        ]);

        card.appendChild(actions);

        return card;
    }

    function render(items) {

        listContainer.replaceChildren();

        if (!items.length) {
            emptyState.style.display = "";
            return;
        }

        emptyState.style.display = "none";

        items.forEach(delivery => {
            listContainer.appendChild(createCard(delivery));
        });

    }

    function filterDeliveries() {

        const keyword = searchInput.value.trim().toLowerCase();

        if (!keyword) {
            render(deliveries);
            return;
        }

        const filtered = deliveries.filter(delivery => {

            return (
                String(delivery.deliveryid).toLowerCase().includes(keyword) ||
                String(delivery.pickup).toLowerCase().includes(keyword) ||
                String(delivery.dropoff).toLowerCase().includes(keyword) ||
                String(delivery.status).toLowerCase().includes(keyword)
            );

        });

        render(filtered);

    }

    searchInput.addEventListener("input", filterDeliveries);

    render(deliveries);

    const header = createElement("div", {
        style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
        }
    }, [

        createElement("div", {}, [

            createElement("h2", {
                textContent: "Available Deliveries"
            }),

            createElement("p", {
                textContent: `${deliveries.length} mission(s) available`
            })

        ]),

        searchInput

    ]);

    return createElement("section", {
        class: "available-deliveries-page"
    }, [

        header,

        emptyState,

        listContainer

    ]);

}

export { AvailableDeliveriesPage };