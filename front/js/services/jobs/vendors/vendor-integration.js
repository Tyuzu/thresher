import { hireVendors } from "./vendors.js";
import { apiFetch } from "../../../api/api.js";
import { injectVendorStyles } from "./vendorStyles.js";

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

/**
 * Add vendor management tab to event details
 * Call this when user views/edits an event
 */
export async function initEventVendorManagement(eventId, containerElement) {
    if (!containerElement) {
        console.error("Container element required");
        return;
    }

    const vendorTab = document.createElement("div");
    vendorTab.id = "event-vendors-tab";
    vendorTab.className = "event-section";

    await loadEventVendorsSummary(eventId, vendorTab);

    containerElement.appendChild(vendorTab);
}

/**
 * Load summary of hired vendors for an event
 */
async function loadEventVendorsSummary(eventId, container) {
    try {
        const response = await apiFetch(`/vendors/events/${eventId}`, "GET");

        if (response?.success === false) {
            console.error("API error loading vendors:", response.error);
            container.innerHTML = "";
            const errorEl = document.createElement("p");
            errorEl.textContent = "Failed to load vendors.";
            container.appendChild(errorEl);
            return;
        }

        const vendors = normalizeVendorList(response);

        const summary = document.createElement("div");
        summary.className = "vendors-summary";

        const title = document.createElement("h3");
        title.textContent = vendors.length > 0
            ? `Hired Vendors (${vendors.length})`
            : "Event Vendors";
        summary.appendChild(title);

        if (!vendors.length) {
            const empty = document.createElement("p");
            empty.textContent = "No vendors hired yet for this event.";
            summary.appendChild(empty);
        } else {
            const list = document.createElement("div");
            list.className = "hired-vendors-list";

            vendors.forEach((vendor) => {
                const item = document.createElement("div");
                item.className = "vendor-summary-item";

                const nameEl = document.createElement("h4");
                nameEl.textContent = vendor?.name || "Unnamed Vendor";
                item.appendChild(nameEl);

                const categoryEl = document.createElement("span");
                categoryEl.className = "vendor-category";
                categoryEl.textContent = vendor?.category || "General";
                item.appendChild(categoryEl);

                const ratingValue = Number(vendor?.rating || 0);
                if (ratingValue > 0) {
                    const ratingEl = document.createElement("div");
                    ratingEl.className = "rating";
                    ratingEl.textContent = `⭐ ${ratingValue.toFixed(1)}`;
                    item.appendChild(ratingEl);
                }

                list.appendChild(item);
            });

            summary.appendChild(list);
        }

        const manageBtn = document.createElement("button");
        manageBtn.type = "button";
        manageBtn.className = "btn-primary manage-vendors-btn";
        manageBtn.textContent = "Manage Vendors";
        manageBtn.addEventListener("click", () => {
            openVendorManagementModal(eventId);
        });
        summary.appendChild(manageBtn);

        container.innerHTML = "";
        container.appendChild(summary);
    } catch (error) {
        console.error("Error loading vendors summary:", error);
        container.innerHTML = "";
        const errorEl = document.createElement("p");
        errorEl.textContent = "Failed to load vendors.";
        container.appendChild(errorEl);
    }
}

/**
 * Open vendor management modal for an event
 */
export async function openVendorManagementModal(eventId) {
    const modal = document.createElement("div");
    modal.className = "vendor-management-modal modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h2");
    title.textContent = "Manage Event Vendors";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.id = "vendor-management-container";
    body.className = "modal-body";

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    closeBtn.addEventListener("click", () => {
        modal.remove();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    await hireVendors(body, true, eventId);
}

/**
 * Add vendor selection step to event creation form
 * Call after event is created
 */
export async function addVendorSelectionToEventCreation(eventId, formElement) {
    const vendorSection = document.createElement("div");
    vendorSection.className = "event-creation-section";

    const title = document.createElement("h3");
    title.textContent = "Vendors (Optional)";

    const description = document.createElement("p");
    description.textContent = "Hire vendors to provide services for your event";

    const vendorContainer = document.createElement("div");
    vendorContainer.className = "event-creation-vendors";

    vendorSection.appendChild(title);
    vendorSection.appendChild(description);
    vendorSection.appendChild(vendorContainer);

    formElement.appendChild(vendorSection);

    await hireVendors(vendorContainer, true, eventId);
}

/**
 * Show vendor profile in user settings
 * Call when user is a vendor
 */
export async function showVendorProfile(userId, container) {
    try {
        const user = await apiFetch(`/users/${userId}`, "GET");

        if (user?.success === false) {
            console.error("API error loading user:", user.error);
            container.innerHTML = "";
            const errorEl = document.createElement("p");
            errorEl.textContent = "Error loading profile";
            container.appendChild(errorEl);
            return;
        }

        container.innerHTML = "";

        if (!user || !user.is_vendor) {
            const profile = document.createElement("div");
            profile.className = "no-vendor-profile";

            const title = document.createElement("h3");
            title.textContent = "Become a Vendor";

            const description = document.createElement("p");
            description.textContent = "Register as a vendor to start offering your services for events";

            const registerBtn = document.createElement("button");
            registerBtn.type = "button";
            registerBtn.id = "register-vendor-btn";
            registerBtn.className = "btn-primary";
            registerBtn.textContent = "Register as Vendor";
            registerBtn.addEventListener("click", () => {
                openVendorRegistration();
            });

            profile.appendChild(title);
            profile.appendChild(description);
            profile.appendChild(registerBtn);

            container.appendChild(profile);
            return;
        }

        const vendorData = user.vendor_profile || {};

        const profile = document.createElement("div");
        profile.className = "vendor-profile";

        const title = document.createElement("h3");
        title.textContent = "Your Vendor Profile";
        profile.appendChild(title);

        profile.appendChild(createProfileField("Category:", vendorData.category || "—"));
        profile.appendChild(createProfileField("Rating:", `⭐ ${vendorData.rating || "Not rated yet"}`));
        profile.appendChild(
            createProfileField(
                "Status:",
                vendorData.verified ? "✓ Verified" : "Pending verification"
            )
        );

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.id = "edit-vendor-btn";
        editBtn.className = "btn-secondary";
        editBtn.textContent = "Edit Profile";
        editBtn.addEventListener("click", () => {
            openEditVendorProfile(userId);
        });

        profile.appendChild(editBtn);
        container.appendChild(profile);
    } catch (error) {
        console.error("Error loading vendor profile:", error);
        container.innerHTML = "";
        const errorEl = document.createElement("p");
        errorEl.textContent = "Error loading profile";
        container.appendChild(errorEl);
    }
}

function createProfileField(labelText, valueText) {
    const field = document.createElement("div");
    field.className = "profile-field";

    const label = document.createElement("label");
    label.textContent = labelText;

    const value = document.createElement("span");
    value.textContent = valueText;

    field.appendChild(label);
    field.appendChild(value);

    return field;
}

/**
 * Open vendor registration modal
 */
export async function openVendorRegistration() {
    const modal = document.createElement("div");
    modal.className = "vendor-registration-modal modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h2");
    title.textContent = "Register as a Vendor";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.id = "vendor-reg-container";
    body.className = "modal-body";

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    closeBtn.addEventListener("click", () => {
        modal.remove();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    await hireVendors(body, true, null);
}

// ============================================
// 7. INITIALIZATION
// ============================================

/**
 * Call this on app startup to set up vendor system
 */
export function initVendorSystem() {
    injectVendorStyles();
    console.warn("Vendor system initialized");
}

/**
 * Placeholder for vendor profile editing
 * Replace with your actual implementation
 */
export function openEditVendorProfile(userId) {
    console.warn("openEditVendorProfile is not implemented yet:", userId);
}