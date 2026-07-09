import { createElement } from "../../../components/createElement.js";

function DeliveryCard(delivery, options = {}) {
    const {
        onAccept = null,
        showButton = true
    } = options;

    const button = showButton
        ? createElement("button", {
            class: "btn btn-primary",
            textContent: "Accept Delivery",
            events: {
                click: () => {
                    if (onAccept) {
                        onAccept(delivery);
                    }
                }
            }
        })
        : null;

    return createElement("div", {
        class: "delivery-card"
    }, [

        createElement("div", {
            class: "delivery-card-header"
        }, [

            createElement("strong", {
                textContent: `Delivery #${delivery.deliveryid}`
            }),

            createElement("span", {
                class: "reward",
                textContent: `₹${delivery.reward}`
            })

        ]),

        createElement("div", {
            class: "delivery-card-body"
        }, [

            createElement("p", {
                textContent: `Pickup: ${delivery.pickup}`
            }),

            createElement("p", {
                textContent: `Drop: ${delivery.dropoff}`
            }),

            createElement("p", {
                textContent: `Distance: ${delivery.distance}`
            }),

            createElement("p", {
                textContent: `Weight: ${delivery.weight}`
            }),

            createElement("p", {
                textContent: `Status: ${delivery.status}`
            })

        ]),

        createElement("div", {
            class: "delivery-card-footer"
        }, [
            button
        ])

    ]);
}

export { DeliveryCard };