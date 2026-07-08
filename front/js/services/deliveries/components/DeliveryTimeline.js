import { createElement } from "../../../components/createElement.js";

const STEPS = [
    "Waiting",
    "Accepted",
    "Reached Pickup",
    "Picked Up",
    "In Transit",
    "Arrived",
    "Delivered"
];

function DeliveryTimeline(currentStatus = "Waiting") {

    const currentIndex = STEPS.findIndex(step =>
        step.toLowerCase() === currentStatus.toLowerCase()
    );

    return createElement("div", {
        class: "delivery-timeline"
    }, STEPS.map((step, index) => {

        let icon = "○";

        if (index < currentIndex) {
            icon = "✔";
        } else if (index === currentIndex) {
            icon = "●";
        }

        return createElement("div", {
            class: "timeline-item",
            style: {
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                alignItems: "center"
            }
        }, [

            createElement("span", {
                textContent: icon
            }),

            createElement("span", {
                textContent: step
            })

        ]);

    }));
}

export { DeliveryTimeline };