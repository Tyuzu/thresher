import Notify from "../../../components/ui/Notify.mjs";
import { loadVendors } from "./loadVendors.js";
import { vendorForm } from "./vendorForm.js";

/**
 * Main vendor management component
 * Displays vendor marketplace and registration form
 */
export async function hireVendors(anacon, isLoggedIn, eventId) {
    if (!anacon) {
        console.error("Vendor container element is required.");
        return null;
    }

    if (!isLoggedIn) {
        Notify("Please log in first.", {
            type: "warning",
            duration: 3000,
            dismissible: true
        });
        return null;
    }

    const render = async () => {
        anacon.innerHTML = "";

        const container = document.createElement("div");
        container.id = "vendors-wrapper";
        container.className = "vendors-container";

        const header = document.createElement("div");
        header.className = "vendors-header";

        const title = document.createElement("h2");
        title.className = "vendors-title";
        title.textContent = "Vendors Marketplace";

        const subtitle = document.createElement("p");
        subtitle.className = "vendors-subtitle";
        subtitle.textContent = "Hire multiple vendors for your event";

        header.appendChild(title);
        header.appendChild(subtitle);
        container.appendChild(header);

        const vendorListEl = await loadVendors(eventId, isLoggedIn, {
            onHireSuccess: render
        });
        container.appendChild(vendorListEl);

        const registrationSection = document.createElement("div");
        registrationSection.className = "vendor-registration-section";

        const registrationTitle = document.createElement("h3");
        registrationTitle.className = "registration-title";
        registrationTitle.textContent = "Want to Become a Vendor?";

        registrationSection.appendChild(registrationTitle);
        registrationSection.appendChild(vendorForm(anacon, isLoggedIn, eventId, render));
        container.appendChild(registrationSection);

        anacon.appendChild(container);
        return container;
    };

    return render();
}