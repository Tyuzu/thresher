import { createElement } from "../../../components/createElement.js";

const STATUS_COLORS = {
    waiting: "#6c757d",
    accepted: "#0d6efd",
    pickup: "#fd7e14",
    transit: "#198754",
    arrived: "#6f42c1",
    delivered: "#20c997",
    cancelled: "#dc3545"
};

function DeliveryStatusBadge(status = "waiting") {
    const color = STATUS_COLORS[status.toLowerCase()] || "#6c757d";

    return createElement("span", {
        class: "delivery-status-badge",
        style: {
            backgroundColor: color,
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "capitalize",
            display: "inline-block"
        },
        textContent: status
    });
}

export { DeliveryStatusBadge };