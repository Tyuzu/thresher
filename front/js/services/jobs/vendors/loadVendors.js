import Notify from "../../../components/ui/Notify.mjs";
import { fetchEventVendors, fetchVendors } from "./vendorService.js";
import { displayBooking } from "../../booking/booking.js";
import { getState } from "../../../state/state.js";
import { hireVendor } from "./hireVendorAction.js";
import { getVendorId, getVendorName, normalizeVendorList } from "./vendorUtils.js";

function createTextElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    element.textContent = textContent;
    return element;
}

function getVendorHiringRecord(vendorId, eventVendors) {
    return eventVendors.find((eventVendor) => {
        const hiredVendorId = getVendorId(eventVendor);
        return String(hiredVendorId) === String(vendorId);
    });
}

function formatRequestStatus(status) {
    if (!status) {
        return "Pending";
    }

    const normalized = String(status).toLowerCase();
    switch (normalized) {
        case "pending":
            return "Request Pending";
        case "accepted":
        case "hired":
            return "Already Hired ✓";
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        default:
            return status;
    }
}

export async function loadVendors(eventId, isLoggedIn = true, options = {}) {
    console.debug("loadVendors called", { eventId, isLoggedIn });
    const { onHireSuccess } = options;

    let vendors = [];
    let eventVendors = [];

    const container = document.createElement("div");
    container.id = "vendors-list";

    container.appendChild(createTextElement("h4", null, "Available Vendors"));

    try {
        const vendorsResponse = await fetchVendors();
        vendors = normalizeVendorList(vendorsResponse);

        if (eventId) {
            try {
                const eventVendorsResponse = await fetchEventVendors(eventId);
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
        const vendorId = getVendorId(vendor);
        const vendorName = getVendorName(vendor);
        const hiringRecord = eventId && vendorId ? getVendorHiringRecord(vendorId, eventVendors) : null;
        const hired = Boolean(hiringRecord);
        const hiringStatus = hiringRecord?.status;

        const vendorCard = document.createElement("div");
        vendorCard.className = "vendor-card";

        const nameEl = document.createElement("h5");
        nameEl.textContent = vendorName;
        vendorCard.appendChild(nameEl);

        const categoryEl = document.createElement("span");
        categoryEl.className = "vendor-category";
        categoryEl.textContent = vendor?.category || "General";
        vendorCard.appendChild(categoryEl);

        const infoEl = document.createElement("div");
        infoEl.className = "vendor-info";

        if (hiringStatus) {
            const statusEl = document.createElement("div");
            statusEl.className = `vendor-hiring-status status-${String(hiringStatus).toLowerCase()}`;
            statusEl.textContent = formatRequestStatus(hiringStatus);
            vendorCard.appendChild(statusEl);
        }

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

        if (eventId && vendorId) {
            const hireButton = document.createElement("button");
            hireButton.type = "button";
            hireButton.className = `hire-btn${hired ? " hired" : ""}`;
            hireButton.disabled = hired;
            hireButton.textContent = hired ? formatRequestStatus(hiringStatus) : "Hire Vendor";

            hireButton.addEventListener("click", async () => {
                if (!isLoggedIn) {
                    Notify("Please log in to hire vendors.", {
                        type: "warning",
                        duration: 3000
                    });
                    return;
                }

                const originalLabel = hireButton.textContent;
                hireButton.disabled = true;
                hireButton.textContent = "Hiring...";

                const hiredSuccessfully = await hireVendor(eventId, vendorId, vendorName);

                if (hiredSuccessfully) {
                    if (typeof onHireSuccess === "function") {
                        await onHireSuccess({
                            eventId,
                            vendorId,
                            vendor
                        });
                    }
                    return;
                }

                if (!hired) {
                    hireButton.disabled = false;
                    hireButton.textContent = originalLabel;
                }
            });

            actionsEl.appendChild(hireButton);
        }

        // Booking integration: allow booking the vendor as an entity
        if (vendorId) {
            const bookBtn = document.createElement("button");
            bookBtn.type = "button";
            bookBtn.className = "btn-primary book-vendor-btn";
            bookBtn.textContent = "Book";

            bookBtn.addEventListener("click", async () => {
                if (!getState || !getState("token")) {
                    Notify("Please log in to book vendors.", { type: "warning", duration: 3000 });
                    return;
                }

                // Create a temporary container and render booking widget then open modal
                const bookingContainer = document.createElement("div");
                bookingContainer.style.display = "none";
                document.body.appendChild(bookingContainer);

                try {
                    displayBooking({ entityType: "vendor", entityId: vendorId, entityCategory: vendorName, userId: getState("user") || "guest" }, bookingContainer);

                    // trigger the action button inside bookingContainer to open modal
                    const action = bookingContainer.querySelector(".btn-primary");
                    if (action) action.click();
                } catch (err) {
                    console.error("Failed to open booking modal:", err);
                    Notify("Failed to open booking interface.", { type: "error", duration: 3000 });
                }
            });

            actionsEl.appendChild(bookBtn);
        } else {
            const note = document.createElement("div");
            note.className = "vendor-actions-note";
            note.textContent = "Select an event to hire vendors.";
            actionsEl.appendChild(note);
        }

        vendorCard.appendChild(actionsEl);
        vendorGrid.appendChild(vendorCard);
    });

    container.appendChild(vendorGrid);
    return container;
}