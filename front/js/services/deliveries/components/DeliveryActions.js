import { createElement } from "../../../components/createElement.js";

const ACTIONS = {
    waiting: [
        {
            label: "Accept Delivery",
            nextStatus: "Accepted"
        }
    ],

    accepted: [
        {
            label: "Reached Pickup",
            nextStatus: "Reached Pickup"
        }
    ],

    "reached pickup": [
        {
            label: "Package Picked Up",
            nextStatus: "Picked Up"
        }
    ],

    "picked up": [
        {
            label: "Start Delivery",
            nextStatus: "In Transit"
        }
    ],

    "in transit": [
        {
            label: "Arrived",
            nextStatus: "Arrived"
        }
    ],

    arrived: [
        {
            label: "Mark Delivered",
            nextStatus: "Delivered"
        }
    ],

    delivered: []
};

function DeliveryActions(status, callback = () => {}) {

    const actions = ACTIONS[status.toLowerCase()] || [];

    return createElement("div", {
        class: "delivery-actions",
        style: {
            display: "flex",
            gap: "10px",
            flexWrap: "wrap"
        }
    }, actions.map(action => {

        return createElement("button", {
            class: "btn btn-primary",
            textContent: action.label,
            events: {
                click: () => callback(action.nextStatus)
            }
        });

    }));

}

export { DeliveryActions };