import { createElement } from "../../components/createElement.js";
import { TrackingHeader } from "./components/TrackingHeader.js";
import { RewardCard } from "./components/RewardCard.js";
import { DriverInfoCard } from "./components/DriverInfoCard.js";
import { DeliveryMap } from "./components/DeliveryMap.js";

function DeliveryDetailsPage({
    delivery = {},
    onAccept = () => {},
    onBack = () => {}
} = {}) {

    function infoRow(label, value) {
        return createElement("div", {
            style: {
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #eee"
            }
        }, [

            createElement("strong", {
                textContent: label
            }),

            createElement("span", {
                textContent: value ?? "-"
            })

        ]);
    }

    const packageCard = createElement("div", {
        class: "card",
        style: {
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px"
        }
    }, [

        createElement("h3", {
            textContent: "Package Information"
        }),

        infoRow("Package", delivery.packageName || "General Package"),
        infoRow("Weight", delivery.weight || "-"),
        infoRow("Pickup", delivery.pickup || "-"),
        infoRow("Destination", delivery.dropoff || "-"),
        infoRow("Distance", delivery.distance || "-"),
        infoRow("Status", delivery.status || "-")

    ]);

    const customerCard = createElement("div", {
        class: "card",
        style: {
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px"
        }
    }, [

        createElement("h3", {
            textContent: "Customer"
        }),

        infoRow("Name", delivery.customerName || "-"),
        infoRow("Phone", delivery.customerPhone || "-"),
        infoRow("Address", delivery.dropoff || "-")

    ]);

    const buttons = createElement("div", {
        style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px"
        }
    }, [

        createElement("button", {
            class: "btn",
            textContent: "Back",
            events: {
                click() {
                    onBack();
                }
            }
        }),

        createElement("button", {
            class: "btn btn-primary",
            textContent: "Accept Delivery",
            events: {
                click() {
                    onAccept(delivery);
                }
            }
        })

    ]);

    return createElement("section", {
        class: "delivery-details-page",
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "20px"
        }
    }, [

        TrackingHeader(delivery),

        createElement("div", {
            style: {
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "20px"
            }
        }, [

            createElement("div", {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                }
            }, [

                packageCard,

                customerCard,

                DeliveryMap(delivery)

            ]),

            createElement("div", {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                }
            }, [

                RewardCard(delivery.reward || 0),

                DriverInfoCard(delivery.driver || {})

            ])

        ]),

        buttons

    ]);

}

export { DeliveryDetailsPage };