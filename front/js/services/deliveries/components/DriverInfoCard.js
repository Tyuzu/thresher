import { createElement } from "../../../components/createElement.js";

function DriverInfoCard(driver = {}) {

    return createElement("div", {
        class: "driver-info-card"
    }, [

        createElement("h3", {
            textContent: "Driver"
        }),

        createElement("p", {
            textContent: `Name: ${driver.name || "Unassigned"}`
        }),

        createElement("p", {
            textContent: `Phone: ${driver.phone || "-" }`
        }),

        createElement("p", {
            textContent: `Vehicle: ${driver.vehicle || "-" }`
        })

    ]);

}

export { DriverInfoCard };