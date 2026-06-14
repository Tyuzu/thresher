import { hireVendors } from "./vendors.js";
import { vendorForm } from "./vendorForm.js";
import { createModal } from "./modal.js";
import { fetchEventVendors, fetchAvailability, createAvailability, deleteAvailability, getMyVendorRequests, updateVendorHiringStatus } from "./vendorService.js";
import { removeVendor } from "./hireVendorAction.js";
import {
    getVendorId,
    getVendorName,
    normalizeVendorList
} from "./vendorUtils.js";
import { VENDOR_EVENTS } from "./vendorEvents.js";
import { apiFetch } from "../../../api/api.js";
import { deleteVendor } from "./vendorService.js";
import Notify from "../../../components/ui/Notify.mjs";

async function renderEventVendorSummary(eventId, container, options = {}) {
    const {
        allowRemove = false,
        showManageButton = true,
        onManageClick = null
    } = options;

    try {
        const response = await fetchEventVendors(eventId);

        if (response?.success === false) {
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

                const vendorId = getVendorId(vendor);
                const vendorName = getVendorName(vendor);

                const nameEl = document.createElement("h4");
                nameEl.textContent = vendorName;
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

                if (allowRemove && vendorId) {
                    const actions = document.createElement("div");
                    actions.className = "vendor-summary-actions";

                    const removeBtn = document.createElement("button");
                    removeBtn.type = "button";
                    removeBtn.className = "btn-secondary remove-vendor-btn";
                    removeBtn.textContent = "Remove";

                    removeBtn.addEventListener("click", async () => {
                        const confirmed = window.confirm(`Remove ${vendorName} from this event?`);
                        if (!confirmed) {
                            return;
                        }

                        const original = removeBtn.textContent;
                        removeBtn.disabled = true;
                        removeBtn.textContent = "Removing...";

                        const removed = await removeVendor(eventId, vendorId, vendorName);

                        removeBtn.disabled = false;
                        removeBtn.textContent = original;

                        if (removed) {
                            await renderEventVendorSummary(eventId, container, options);
                        }
                    });

                    actions.appendChild(removeBtn);
                    item.appendChild(actions);
                }

                list.appendChild(item);
            });

            summary.appendChild(list);
        }

        if (showManageButton) {
            const manageBtn = document.createElement("button");
            manageBtn.type = "button";
            manageBtn.className = "btn-primary manage-vendors-btn";
            manageBtn.textContent = "Manage Vendors";
            manageBtn.addEventListener("click", () => {
                if (typeof onManageClick === "function") {
                    onManageClick();
                    return;
                }
                openVendorManagementModal(eventId);
            });
            summary.appendChild(manageBtn);
        }

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

export async function initEventVendorManagement(eventId, containerElement) {
    if (!containerElement) {
        console.error("Container element required");
        return;
    }

    const vendorTab = document.createElement("div");
    vendorTab.id = "event-vendors-tab";
    vendorTab.className = "event-section";

    await renderEventVendorSummary(eventId, vendorTab, {
        allowRemove: false,
        showManageButton: true
    });

    containerElement.appendChild(vendorTab);
}

export async function openVendorManagementModal(eventId) {
    const listeners = [];
    let refreshSummary = async () => {};
    let refreshMarketplace = async () => {};

    const { modal, body } = createModal({
        title: "Manage Event Vendors",
        className: "vendor-management-modal",
        onClose: () => {
            for (const { eventName, handler } of listeners) {
                document.removeEventListener(eventName, handler);
            }
            listeners.length = 0;
        }
    });

    document.body.appendChild(modal);

    const summaryContainer = document.createElement("div");
    summaryContainer.className = "vendor-management-summary";
    body.appendChild(summaryContainer);

    const marketplaceContainer = document.createElement("div");
    marketplaceContainer.className = "vendor-management-marketplace";
    body.appendChild(marketplaceContainer);

    refreshSummary = async () => {
        await renderEventVendorSummary(eventId, summaryContainer, {
            allowRemove: true,
            showManageButton: false
        });
    };

    refreshMarketplace = async () => {
        await hireVendors(marketplaceContainer, true, eventId, {
            onChange: refreshSummary
        });
    };

    const handleVendorChanged = async (event) => {
        if (String(event?.detail?.eventId) !== String(eventId)) {
            return;
        }
        await refreshSummary();
    };

    for (const eventName of [
        VENDOR_EVENTS.HIRED,
        VENDOR_EVENTS.REMOVED,
        VENDOR_EVENTS.REGISTERED,
        VENDOR_EVENTS.UPDATED,
        VENDOR_EVENTS.DELETED
    ]) {
        document.addEventListener(eventName, handleVendorChanged);
        listeners.push({ eventName, handler: handleVendorChanged });
    }

    await refreshSummary();
    await refreshMarketplace();
}

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
                openVendorRegistration(async () => {
                    await showVendorProfile(userId, container);
                });
            });

            profile.appendChild(title);
            profile.appendChild(description);
            profile.appendChild(registerBtn);

            container.appendChild(profile);
            return;
        }

        const vendorData = user.vendor_profile || {};
        const vendorId = getVendorId(vendorData);

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

        const actions = document.createElement("div");
        actions.className = "vendor-profile-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.id = "edit-vendor-btn";
        editBtn.className = "btn-secondary";
        editBtn.textContent = "Edit Profile";
        editBtn.addEventListener("click", () => {
            openEditVendorProfile(userId, vendorData, async () => {
                await showVendorProfile(userId, container);
            });
        });

        actions.appendChild(editBtn);

        if (vendorId) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "btn-danger";
            deleteBtn.textContent = "Delete Vendor Profile";

            deleteBtn.addEventListener("click", async () => {
                const confirmed = window.confirm("Delete this vendor profile? This cannot be undone.");
                if (!confirmed) {
                    return;
                }

                deleteBtn.disabled = true;
                deleteBtn.textContent = "Deleting...";

                try {
                    const response = await deleteVendor(vendorId);

                    if (response?.success === false) {
                        throw new Error(response?.error || "Failed to delete vendor profile.");
                    }

                    Notify("Vendor profile deleted.", {
                        type: "success",
                        duration: 3000
                    });

                    dispatchVendorEvent(VENDOR_EVENTS.DELETED, {
                        userId,
                        vendorId,
                        response
                    });

                    await showVendorProfile(userId, container);
                } catch (error) {
                    console.error("Error deleting vendor profile:", error);
                    Notify("Failed to delete vendor profile.", {
                        type: "error",
                        duration: 3000
                    });
                } finally {
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = "Delete Vendor Profile";
                }
            });

            actions.appendChild(deleteBtn);
        }

        profile.appendChild(actions);
        container.appendChild(profile);

        if (vendorId) {
            const requestsSection = document.createElement("div");
            requestsSection.className = "vendor-requests-section";
            const requestsTitle = document.createElement("h3");
            requestsTitle.textContent = "Incoming Vendor Requests";
            requestsSection.appendChild(requestsTitle);

            const requestsContainer = document.createElement("div");
            requestsContainer.className = "vendor-requests-list";
            requestsSection.appendChild(requestsContainer);

            container.appendChild(requestsSection);
            await refreshVendorRequests(requestsContainer);
        }
    } catch (error) {
        console.error("Error loading vendor profile:", error);
        container.innerHTML = "";
        const errorEl = document.createElement("p");
        errorEl.textContent = "Error loading profile";
        container.appendChild(errorEl);
    }
}

async function refreshVendorRequests(container) {
    container.innerHTML = "";

    try {
        const response = await getMyVendorRequests();
        if (!response) {
            throw new Error("No response from server.");
        }

        if (response.success === false) {
            throw new Error(response.error || "Failed to load requests.");
        }

        const requests = Array.isArray(response.requests) ? response.requests : [];
        if (requests.length === 0) {
            const empty = document.createElement("div");
            empty.className = "vendor-requests-empty";
            empty.textContent = "No incoming request at this time.";
            container.appendChild(empty);
            return;
        }

        for (const request of requests) {
            const requestCard = document.createElement("div");
            requestCard.className = "vendor-request-card";

            const title = document.createElement("div");
            title.className = "vendor-request-title";
            title.textContent = `Event: ${request.eventid || request.eventId || "Unknown"}`;
            requestCard.appendChild(title);

            const statusText = formatVendorRequestStatus(request.status);
            const statusBadge = document.createElement("span");
            statusBadge.className = `vendor-request-status status-${(request.status || "unknown").toLowerCase()}`;
            statusBadge.textContent = statusText;
            requestCard.appendChild(statusBadge);

            const details = document.createElement("div");
            details.className = "vendor-request-details";
            details.textContent = `Requested by: ${request.hiredby || request.hiredBy || "Unknown organizer"}`;
            requestCard.appendChild(details);

            if (String(request.status || "").toLowerCase() === "pending") {
                const actions = document.createElement("div");
                actions.className = "vendor-request-actions";

                const acceptBtn = document.createElement("button");
                acceptBtn.type = "button";
                acceptBtn.className = "btn-primary vendor-request-accept";
                acceptBtn.textContent = "Accept";
                acceptBtn.addEventListener("click", async () => {
                    await handleVendorRequestAction(request, "accepted", acceptBtn, rejectBtn, container);
                });

                const rejectBtn = document.createElement("button");
                rejectBtn.type = "button";
                rejectBtn.className = "btn-danger vendor-request-reject";
                rejectBtn.textContent = "Reject";
                rejectBtn.addEventListener("click", async () => {
                    await handleVendorRequestAction(request, "rejected", acceptBtn, rejectBtn, container);
                });

                actions.appendChild(acceptBtn);
                actions.appendChild(rejectBtn);
                requestCard.appendChild(actions);
            }

            container.appendChild(requestCard);
        }
    } catch (error) {
        console.error("Error loading vendor requests:", error);
        const errorMessage = document.createElement("div");
        errorMessage.className = "vendor-requests-error";
        errorMessage.textContent = "Unable to load your vendor requests.";
        container.appendChild(errorMessage);
    }
}

async function handleVendorRequestAction(request, status, acceptButton, rejectButton, container) {
    if (!request || !request.hiringid && !request.hiringID) {
        Notify("Missing request data.", { type: "error", duration: 3000 });
        return;
    }

    const hiringId = request.hiringid || request.hiringID;
    const actionLabel = status === "accepted" ? "Accept" : "Reject";

    try {
        acceptButton.disabled = true;
        rejectButton.disabled = true;

        const result = await updateVendorHiringStatus(hiringId, status);
        if (result?.success === false) {
            throw new Error(result.error || "Failed to update request status.");
        }

        Notify(`Request ${actionLabel.toLowerCase()}ed successfully.`, { type: "success", duration: 3000 });
        await refreshVendorRequests(container);
    } catch (error) {
        console.error(`Failed to ${actionLabel.toLowerCase()} vendor request:`, error);
        Notify(`Failed to ${actionLabel.toLowerCase()} request. Please try again.`, { type: "error", duration: 3000 });
        acceptButton.disabled = false;
        rejectButton.disabled = false;
    }
}

function formatVendorRequestStatus(status) {
    switch (String(status || "").toLowerCase()) {
        case "pending":
            return "Pending";
        case "accepted":
            return "Accepted";
        case "rejected":
            return "Rejected";
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        case "hired":
            return "Hired";
        default:
            return "Unknown";
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

export async function openVendorRegistration(onSuccess = null) {
    const { modal, body } = createModal({
        title: "Register as a Vendor",
        className: "vendor-registration-modal"
    });

    document.body.appendChild(modal);

    const form = vendorForm(
        body,
        true,
        null,
        async (detail) => {
            if (typeof onSuccess === "function") {
                await onSuccess(detail);
            }
            modal.remove();
        },
        {
            mode: "create"
        }
    );

    body.appendChild(form);
}

export async function openEditVendorProfile(userId, existingVendorProfile = null, onSuccess = null) {
    let vendorData = existingVendorProfile;

    try {
        if (!vendorData) {
            const user = await apiFetch(`/users/${userId}`, "GET");

            if (user?.success === false) {
                throw new Error(user?.error || "Failed to load vendor profile.");
            }

            if (!user || !user.is_vendor) {
                Notify("Vendor profile not found.", {
                    type: "error",
                    duration: 3000
                });
                return;
            }

            vendorData = user.vendor_profile || {};
        }

        const vendorId = getVendorId(vendorData);

        const { modal, body } = createModal({
            title: "Edit Vendor Profile",
            className: "vendor-edit-modal"
        });

        document.body.appendChild(modal);

        const form = vendorForm(
            body,
            true,
            null,
            async (detail) => {
                modal.remove();
                if (typeof onSuccess === "function") {
                    await onSuccess(detail);
                }
            },
            {
                mode: "edit",
                vendorId,
                initialData: vendorData,
                submitLabel: "Save Changes"
            }
        );

        body.appendChild(form);

        if (vendorId) {
            const actions = document.createElement("div");
            actions.className = "vendor-edit-actions";

            const reserveSection = document.createElement("div");
            reserveSection.className = "vendor-availability-section";

            const availabilityTitle = document.createElement("h4");
            availabilityTitle.textContent = "Availability Slots";
            reserveSection.appendChild(availabilityTitle);

            const availabilityList = document.createElement("div");
            availabilityList.className = "vendor-availability-list";
            reserveSection.appendChild(availabilityList);

            const availabilityForm = document.createElement("form");
            availabilityForm.className = "vendor-availability-form";
            availabilityForm.innerHTML = `
                <div class="form-row">
                    <label>Start Date</label>
                    <input type="date" name="start_date" required />
                </div>
                <div class="form-row">
                    <label>End Date</label>
                    <input type="date" name="end_date" required />
                </div>
                <div class="form-row">
                    <label>Notes</label>
                    <input type="text" name="notes" placeholder="Optional note" />
                </div>
                <button type="submit" class="btn-primary">Add Slot</button>
            `;

            availabilityForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const startDate = availabilityForm.querySelector("input[name='start_date']").value;
                const endDate = availabilityForm.querySelector("input[name='end_date']").value;
                const notes = availabilityForm.querySelector("input[name='notes']").value;

                if (!startDate || !endDate) {
                    Notify("Please provide both start and end dates.", { type: "warning", duration: 3000 });
                    return;
                }

                const submitBtn = availabilityForm.querySelector("button[type='submit']");
                submitBtn.disabled = true;
                submitBtn.textContent = "Adding...";

                try {
                    const response = await createAvailability(vendorId, { start_date: startDate, end_date: endDate, notes });
                    if (response?.success === false) {
                        throw new Error(response?.error || response?.message || "Failed to add availability slot.");
                    }

                    Notify("Availability slot added.", { type: "success", duration: 3000 });
                    availabilityForm.reset();
                    await loadAvailability();
                } catch (error) {
                    console.error("Unable to add availability slot:", error);
                    Notify(error?.message || "Failed to add availability slot.", { type: "error", duration: 3000 });
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Add Slot";
                }
            });

            reserveSection.appendChild(availabilityForm);
            actions.appendChild(reserveSection);

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "btn-danger";
            deleteBtn.textContent = "Delete Vendor Profile";

            deleteBtn.addEventListener("click", async () => {
                const confirmed = window.confirm("Delete this vendor profile? This cannot be undone.");
                if (!confirmed) {
                    return;
                }

                deleteBtn.disabled = true;
                deleteBtn.textContent = "Deleting...";

                try {
                    const response = await deleteVendor(vendorId);

                    if (response?.success === false) {
                        throw new Error(response?.error || "Failed to delete vendor profile.");
                    }

                    Notify("Vendor profile deleted.", {
                        type: "success",
                        duration: 3000
                    });

                    dispatchVendorEvent(VENDOR_EVENTS.DELETED, {
                        userId,
                        vendorId,
                        response
                    });

                    modal.remove();
                    if (typeof onSuccess === "function") {
                        await onSuccess({
                            userId,
                            vendorId,
                            response,
                            mode: "delete"
                        });
                    }
                } catch (error) {
                    console.error("Error deleting vendor profile:", error);
                    Notify("Failed to delete vendor profile.", {
                        type: "error",
                        duration: 3000
                    });
                } finally {
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = "Delete Vendor Profile";
                }
            });

            actions.appendChild(deleteBtn);
            body.appendChild(actions);

            async function loadAvailability() {
                availabilityList.innerHTML = "Loading availability...";
                try {
                    const response = await fetchAvailability(vendorId);
                    if (response?.success === false) {
                        throw new Error(response?.error || "Failed to load availability.");
                    }

                    const slots = response?.slots || [];
                    if (!slots.length) {
                        availabilityList.innerHTML = "<p>No availability slots yet.</p>";
                        return;
                    }

                    availabilityList.innerHTML = "";
                    for (const slot of slots) {
                        const slotRow = document.createElement("div");
                        slotRow.className = "availability-slot-row";

                        const label = document.createElement("div");
                        label.className = "availability-slot-label";
                        label.textContent = `${slot.start_date} → ${slot.end_date}` + (slot.notes ? ` — ${slot.notes}` : "");
                        slotRow.appendChild(label);

                        const removeBtn = document.createElement("button");
                        removeBtn.type = "button";
                        removeBtn.className = "btn-link btn-small";
                        removeBtn.textContent = "Remove";
                        removeBtn.addEventListener("click", async () => {
                            removeBtn.disabled = true;
                            removeBtn.textContent = "Removing...";
                            try {
                                const deleted = await deleteAvailability(vendorId, slot.slotid);
                                if (deleted?.success === false) {
                                    throw new Error(deleted?.error || deleted?.message || "Failed to remove slot.");
                                }
                                Notify("Slot removed.", { type: "success", duration: 2500 });
                                await loadAvailability();
                            } catch (error) {
                                console.error("Unable to remove availability slot:", error);
                                Notify(error?.message || "Failed to remove slot.", { type: "error", duration: 3000 });
                            }
                        });
                        slotRow.appendChild(removeBtn);
                        availabilityList.appendChild(slotRow);
                    }
                } catch (error) {
                    availabilityList.innerHTML = "<p>Failed to load availability.</p>";
                    console.error("Error loading availability:", error);
                }
            }

            await loadAvailability();
        }
    } catch (error) {
        console.error("Error opening vendor edit modal:", error);
        Notify("Failed to open vendor editor.", {
            type: "error",
            duration: 3000
        });
    }
}