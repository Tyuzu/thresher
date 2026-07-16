import { renderVendorActions } from "./vendorActionsComponent.js";
import { formatRequestStatus } from "./vendorUtils.js";
import { createElement } from "../../../components/createElement.js";

/**
 * Renders an isolated standalone structural card template container block for a vendor profile record.
 */
export function renderVendorCard(vendor, context) {
    const { vendorId, vendorName, hired, hiringStatus, isCreator, eventId, isLoggedIn, onHireSuccess } = context;

    const vendorCard = createElement("div", { class: "vendor-card" }, [
        createElement("h5", {}, vendorName),
        createElement("span", { class: "vendor-category" }, vendor?.category || "General")
    ]);

    if (isCreator && hiringStatus) {
        const statusClass = `vendor-hiring-status status-${String(hiringStatus).toLowerCase()}`;
        vendorCard.appendChild(createElement("div", { class: statusClass }, formatRequestStatus(hiringStatus)));
    }

    // Secondary Info Fields Container
    const infoEl = createElement("div", { class: "vendor-info" });

    if (vendor?.location) {
        infoEl.appendChild(
            createElement("div", {}, [
                createElement("strong", {}, "Location: "),
                vendor.location
            ])
        );
    }

    if (vendor?.description) {
        infoEl.appendChild(createElement("div", {}, vendor.description));
    }

    if (infoEl.childElementCount > 0) {
        vendorCard.appendChild(infoEl);
    }

    // Ratings Display Line
    const ratingValue = Number(vendor?.rating || 0);
    const ratingCount = Number(vendor?.rating_count || 0);
    if (ratingValue > 0 || ratingCount > 0) {
        vendorCard.appendChild(createElement("div", { class: "vendor-rating" }, `⭐ ${ratingValue.toFixed(1)} (${ratingCount} reviews)`));
    }

    // Shared Details
    if (vendor?.phone || vendor?.email) {
        const parts = [];
        if (vendor.phone) parts.push(`📞 ${vendor.phone}`);
        if (vendor.email) parts.push(`📧 ${vendor.email}`);
        vendorCard.appendChild(createElement("div", { class: "vendor-contact" }, parts.join(" | ")));
    }

    // Conditionally attach Actions Panel exclusively if user has Creator authorizations
    if (isCreator && vendorId) {
        const actionButtons = renderVendorActions({
            eventId,
            vendorId,
            vendorName,
            vendor,
            hired,
            hiringStatus,
            isLoggedIn,
            onHireSuccess
        });
        vendorCard.appendChild(actionButtons);
    }

    return vendorCard;
}