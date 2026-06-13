import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { hireVendor } from "./hireVendorAction.js";

function normalizeVendorList(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.vendors)) {
        return response.vendors;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    return [];
}

function createTextElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    element.textContent = textContent;
    return element;
}

/**
 * Load and display available vendors
 * Fetches vendors and displays them in a grid layout
 */
export async function loadVendors(eventId, isLoggedIn = true, options = {}) {
    const { onHireSuccess } = options;

    let vendors = [];
    let eventVendors = [];

    const container = document.createElement("div");
    container.id = "vendors-list";

    container.appendChild(createTextElement("h4", null, "Available Vendors"));

    try {
        const vendorsResponse = await apiFetch("/vendors", "GET");
        vendors = normalizeVendorList(vendorsResponse);

        if (eventId) {
            try {
                const eventVendorsResponse = await apiFetch(`/vendors/events/${eventId}`, "GET");
                eventVendors = normalizeVendorList(eventVendorsResponse);
            } catch (error) {
                console.error("Failed to load event vendors:", error);
                eventVendors = [];
            }
        }
    } catch (error) {
        console.error("Failed to load vendors:", error);
        Notify("Failed to load vendors.", { type: "error", duration: 3000 });

        const errorMessage = document.createElement("div");
        errorMessage.className = "no-vendors-message";
        errorMessage.textContent = "Failed to load vendors.";
        container.appendChild(errorMessage);

        return container;
    }

    if (!vendors || vendors.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "no-vendors-message";
        emptyMessage.textContent = "No vendors available yet. Be the first to register!";

        container.appendChild(emptyMessage);
        return container;
    }

    const vendorGrid = document.createElement("div");
    vendorGrid.className = "vendor-grid";

    vendors.forEach((vendor) => {
        const vendorId = vendor?.vendorid ?? vendor?.id ?? null;
        const isHired = Boolean(vendorId) && eventVendors.some((ev) => {
            const hiredVendorId = ev?.vendorid ?? ev?.id ?? null;
            return String(hiredVendorId) === String(vendorId);
        });

        const vendorCard = document.createElement("div");
        vendorCard.className = "vendor-card";

        const nameEl = document.createElement("h5");
        nameEl.textContent = vendor?.name || "Unnamed Vendor";
        vendorCard.appendChild(nameEl);

        const categoryEl = document.createElement("span");
        categoryEl.className = "vendor-category";
        categoryEl.textContent = vendor?.category || "General";
        vendorCard.appendChild(categoryEl);

        const infoEl = document.createElement("div");
        infoEl.className = "vendor-info";

        if (vendor?.location) {
            const locationEl = document.createElement("div");
            const label = document.createElement("strong");
            label.textContent = "Location: ";
            locationEl.appendChild(label);
            locationEl.appendChild(document.createTextNode(vendor.location));
            infoEl.appendChild(locationEl);
        }

        if (vendor?.description) {
            const descriptionEl = document.createElement("div");
            descriptionEl.textContent = vendor.description;
            infoEl.appendChild(descriptionEl);
        }

        if (infoEl.childElementCount > 0) {
            vendorCard.appendChild(infoEl);
        }

        const ratingValue = Number(vendor?.rating || 0);
        const ratingCount = Number(vendor?.rating_count || 0);
        if (ratingValue > 0 || ratingCount > 0) {
            const ratingEl = document.createElement("div");
            ratingEl.className = "vendor-rating";
            ratingEl.textContent = `⭐ ${ratingValue.toFixed(1)} (${ratingCount} reviews)`;
            vendorCard.appendChild(ratingEl);
        }

        if (vendor?.phone || vendor?.email) {
            const contactEl = document.createElement("div");
            contactEl.className = "vendor-contact";

            const parts = [];
            if (vendor.phone) {
                parts.push(`📞 ${vendor.phone}`);
            }
            if (vendor.email) {
                parts.push(`📧 ${vendor.email}`);
            }

            contactEl.textContent = parts.join(" | ");
            vendorCard.appendChild(contactEl);
        }

        const actionsEl = document.createElement("div");
        actionsEl.className = "vendor-actions";

        const hireButton = document.createElement("button");
        hireButton.type = "button";
        hireButton.className = `hire-btn${isHired ? " hired" : ""}`;
        hireButton.disabled = isHired;
        hireButton.textContent = isHired ? "Already Hired ✓" : "Hire Vendor";

        hireButton.addEventListener("click", async () => {
            if (!isLoggedIn) {
                Notify("Please log in to hire vendors.", {
                    type: "warning",
                    duration: 3000
                });
                return;
            }

            if (!eventId || !vendorId) {
                Notify("Invalid vendor or event ID.", {
                    type: "error",
                    duration: 3000
                });
                return;
            }

            const originalLabel = hireButton.textContent;
            hireButton.disabled = true;
            hireButton.textContent = "Hiring...";

            const hired = await hireVendor(eventId, vendorId, vendor?.name);

            if (hired) {
                if (typeof onHireSuccess === "function") {
                    await onHireSuccess({
                        eventId,
                        vendorId,
                        vendor
                    });
                }
                return;
            }

            if (!isHired) {
                hireButton.disabled = false;
                hireButton.textContent = originalLabel;
            }
        });

        actionsEl.appendChild(hireButton);
        vendorCard.appendChild(actionsEl);
        vendorGrid.appendChild(vendorCard);
    });

    container.appendChild(vendorGrid);
    return container;
}