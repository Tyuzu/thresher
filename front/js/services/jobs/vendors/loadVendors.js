import Notify from "../../../components/ui/Notify.mjs";
import { fetchEventVendors, fetchVendors } from "./vendorService.js";
import { getVendorId, getVendorName, normalizeVendorList } from "./vendorUtils.js";
import { renderVendorCard } from "./vendorCardComponent.js";
import { createElement } from "../../../components/createElement.js";

function getVendorHiringRecord(vendorId, eventVendors) {
    return eventVendors.find((eventVendor) => String(getVendorId(eventVendor)) === String(vendorId));
}

/**
 * Loads, verifies, handles structural layouts, and handles initialization of vendor directory data structures.
 */
export async function loadVendors(eventId, isLoggedIn = true, options = {}) {
    const { onHireSuccess, isCreator = false } = options;

    const container = createElement("div", { id: "vendors-list" }, [
        createElement("h4", {}, "Available Vendors")
    ]);

    let vendors = [];
    let eventVendors = [];

    // 1. Fetch data arrays asynchronously
    try {
        const vendorsResponse = await fetchVendors();
        vendors = normalizeVendorList(vendorsResponse);

        if (eventId && isCreator) {
            try {
                const eventVendorsResponse = await fetchEventVendors(eventId);
                eventVendors = normalizeVendorList(eventVendorsResponse);
            } catch (err) {
                console.error("Failed to load event vendors context:", err);
            }
        }
    } catch (error) {
        console.error("Failed to load vendors:", error);
        Notify("Failed to load vendors.", { type: "error", duration: 3000 });
        container.appendChild(createElement("div", { class: "no-vendors-message" }, "Failed to load vendors."));
        return container;
    }

    // 2. State Validations
    if (!vendors || vendors.length === 0) {
        container.appendChild(createElement("div", { class: "no-vendors-message" }, "No vendors available yet. Be the first to register!"));
        return container;
    }

    // 3. Render Node Elements
    const vendorGrid = createElement("div", { class: "vendor-grid" });

    vendors.forEach((vendor) => {
        const vendorId = getVendorId(vendor);
        const vendorName = getVendorName(vendor);
        const hiringRecord = eventId && vendorId ? getVendorHiringRecord(vendorId, eventVendors) : null;

        const cardContext = {
            vendorId,
            vendorName,
            hired: Boolean(hiringRecord),
            hiringStatus: hiringRecord?.status,
            isCreator,
            eventId,
            isLoggedIn,
            onHireSuccess
        };

        const vendorCardNode = renderVendorCard(vendor, cardContext);
        vendorGrid.appendChild(vendorCardNode);
    });

    container.appendChild(vendorGrid);
    return container;
}