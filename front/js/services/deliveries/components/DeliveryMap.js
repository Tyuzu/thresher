import { createElement } from "../../../components/createElement.js";

function DeliveryMap(delivery = {}) {

    return createElement("div", {
        class: "delivery-map-placeholder",
        style: {
            border: "2px dashed #ccc",
            borderRadius: "8px",
            padding: "40px 20px",
            textAlign: "center",
            background: "#fafafa"
        }
    }, [

        createElement("h3", {
            textContent: "Location"
        }),

        createElement("p", {
            textContent: "Map support will be added later."
        }),

        createElement("p", {
            textContent: `Pickup: ${delivery.pickup || "-" }`
        }),

        createElement("p", {
            textContent: `Destination: ${delivery.dropoff || "-" }`
        })

    ]);

}

export { DeliveryMap };