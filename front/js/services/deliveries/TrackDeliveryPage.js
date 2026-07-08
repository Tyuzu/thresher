import { createElement } from "../../components/createElement.js";

import { TrackingHeader } from "../components/TrackingHeader.js";
import { DeliveryTimeline } from "../components/DeliveryTimeline.js";
import { DriverInfoCard } from "../components/DriverInfoCard.js";
import { ETAWidget } from "../components/ETAWidget.js";
import { DeliveryMap } from "../components/DeliveryMap.js";

function TrackDeliveryPage({
    delivery = {}
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
            textContent: "Delivery Information"
        }),

        infoRow("Tracking ID", delivery.id),
        infoRow("Package", delivery.packageName),
        infoRow("Pickup", delivery.pickup),
        infoRow("Destination", delivery.dropoff),
        infoRow("Status", delivery.status),
        infoRow("Last Updated", delivery.updatedAt)

    ]);

    const timelineCard = createElement("div", {
        class: "card",
        style: {
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px"
        }
    }, [

        createElement("h3", {
            textContent: "Delivery Timeline"
        }),

        DeliveryTimeline(delivery.status)

    ]);

    return createElement("section", {
        class: "track-delivery-page",
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

                DeliveryMap(delivery),

                timelineCard

            ]),

            createElement("div", {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                }
            }, [

                ETAWidget(delivery.eta || "--"),

                DriverInfoCard(delivery.driver || {}),

                createElement("div", {
                    class: "card",
                    style: {
                        padding: "20px",
                        border: "1px solid #ddd",
                        borderRadius: "8px"
                    }
                }, [

                    createElement("h3", {
                        textContent: "Delivery Notes"
                    }),

                    createElement("p", {
                        textContent: delivery.notes || "No additional notes."
                    })

                ])

            ])

        ])

    ]);

}

export { TrackDeliveryPage };