import { createElement } from "../../../components/createElement.js";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge.js";

function TrackingHeader(delivery = {}) {

    return createElement("div", {
        class: "tracking-header",
        style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
        }
    }, [

        createElement("div", {}, [

            createElement("h2", {
                textContent: `Delivery #${delivery.id || "-"}`
            }),

            createElement("div", {
                style: {
                    color: "#666",
                    fontSize: "14px"
                },
                textContent: `Last Updated: ${delivery.updatedAt || "Unknown"}`
            })

        ]),

        DeliveryStatusBadge(delivery.status || "Waiting")

    ]);

}

export { TrackingHeader };