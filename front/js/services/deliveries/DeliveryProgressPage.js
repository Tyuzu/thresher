import { createElement } from "../../components/createElement.js";

import { TrackingHeader } from "./components/TrackingHeader.js";
import { DeliveryTimeline } from "./components/DeliveryTimeline.js";
import { DeliveryActions } from "./components/DeliveryActions.js";
import { DriverInfoCard } from "./components/DriverInfoCard.js";
import { ETAWidget } from "./components/ETAWidget.js";
import { RewardCard } from "./components/RewardCard.js";
import { DeliveryMap } from "./components/DeliveryMap.js";

function DeliveryProgressPage({
    delivery = {},
    onStatusChange = () => {},
    onCancel = () => {}
} = {}) {

    let currentStatus = delivery.status || "Waiting";

    const timelineContainer = createElement("div");
    const actionsContainer = createElement("div");
    const headerContainer = createElement("div");

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

    function refresh() {

        delivery.status = currentStatus;

        headerContainer.replaceChildren(
            TrackingHeader(delivery)
        );

        timelineContainer.replaceChildren(
            DeliveryTimeline(currentStatus)
        );

        actionsContainer.replaceChildren(
            DeliveryActions(currentStatus, nextStatus => {

                currentStatus = nextStatus;

                refresh();

                onStatusChange(currentStatus, delivery);

            })
        );

    }

    const deliveryCard = createElement("div", {
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

        infoRow("Delivery ID", delivery.deliveryid),
        infoRow("Pickup", delivery.pickup),
        infoRow("Destination", delivery.dropoff),
        infoRow("Weight", delivery.weight),
        infoRow("Distance", delivery.distance)

    ]);

    const cancelButton = createElement("button", {
        class: "btn btn-danger",
        textContent: "Cancel Delivery",
        events: {
            click() {
                onCancel(delivery);
            }
        }
    });

    const page = createElement("section", {
        class: "delivery-progress-page",
        style: {
            display: "flex",
            flexDirection: "column",
            gap: "20px"
        }
    }, [

        headerContainer,

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

                deliveryCard,

                DeliveryMap(delivery),

                createElement("div", {
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

                    timelineContainer

                ])

            ]),

            createElement("div", {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                }
            }, [

                ETAWidget(delivery.eta || "--"),

                RewardCard(delivery.reward || 0),

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
                        textContent: "Actions"
                    }),

                    actionsContainer,

                    createElement("hr"),

                    cancelButton

                ])

            ])

        ])

    ]);

    refresh();

    return page;

}

export { DeliveryProgressPage };