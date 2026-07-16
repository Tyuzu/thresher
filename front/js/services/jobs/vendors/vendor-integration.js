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
import { createElement } from "../../../components/createElement.js";

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
            container.appendChild(createElement("p", {}, "Failed to load vendors."));
            return;
        }

        const vendors = normalizeVendorList(response);

        const summary = createElement("div", { class: "vendors-summary" });

        const titleText = vendors.length > 0
            ? `Hired Vendors (${vendors.length})`
            : "Event Vendors";
        summary.appendChild(createElement("h3", {}, titleText));

        if (!vendors.length) {
            summary.appendChild(createElement("p", {}, "No vendors hired yet for this event."));
        } else {
            const list = createElement("div", { class: "hired-vendors-list" });

            vendors.forEach((vendor) => {
                const item = createElement("div", { class: "vendor-summary-item" });

                const vendorId = getVendorId(vendor);
                const vendorName = getVendorName(vendor);

                item.appendChild(createElement("h4", {}, vendorName));
                item.appendChild(createElement("span", { class: "vendor-category" }, vendor?.category || "General"));

                const ratingValue = Number(vendor?.rating || 0);
                if (ratingValue > 0) {
                    item.appendChild(createElement("div", { class: "rating" }, `⭐ ${ratingValue.toFixed(1)}`));
                }

                if (allowRemove && vendorId) {
                    const removeBtn = createElement("button", {
                        type: "button",
                        class: "btn-secondary remove-vendor-btn",
                        events: {
                            click: async () => {
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
                            }
                        }
                    }, "Remove");

                    const actions = createElement("div", { class: "vendor-summary-actions" }, [removeBtn]);
                    item.appendChild(actions);
                }

                list.appendChild(item);
            });

            summary.appendChild(list);
        }

        if (showManageButton) {
            const manageBtn = createElement("button", {
                type: "button",
                class: "btn-primary manage-vendors-btn",
                events: {
                    click: () => {
                        if (typeof onManageClick === "function") {
                            onManageClick();
                            return;
                        }
                        openVendorManagementModal(eventId);
                    }
                }
            }, "Manage Vendors");
            summary.appendChild(manageBtn);
        }

        container.innerHTML = "";
        container.appendChild(summary);
    } catch (error) {
        console.error("Error loading vendors summary:", error);
        container.innerHTML = "";
        container.appendChild(createElement("p", {}, "Failed to load vendors."));
    }
}

export async function initEventVendorManagement(eventId, containerElement) {
    if (!containerElement) {
        console.error("Container element required");
        return;
    }

    const vendorTab = createElement("div", {
        id: "event-vendors-tab",
        class: "event-section"
    });

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

    const summaryContainer = createElement("div", { class: "vendor-management-summary" });
    body.appendChild(summaryContainer);

    const marketplaceContainer = createElement("div", { class: "vendor-management-marketplace" });
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
    const vendorContainer = createElement("div", { class: "event-creation-vendors" });
    const vendorSection = createElement("div", { class: "event-creation-section" }, [
        createElement("h3", {}, "Vendors (Optional)"),
        createElement("p", {}, "Hire vendors to provide services for your event"),
        vendorContainer
    ]);

    formElement.appendChild(vendorSection);

    await hireVendors(vendorContainer, true, eventId);
}

export async function showVendorProfile(userId, container) {
    try {
        const user = await apiFetch(`/users/${userId}`, "GET");

        if (user?.success === false) {
            console.error("API error loading user:", user.error);
            container.innerHTML = "";
            container.appendChild(createElement("p", {}, "Error loading profile"));
            return;
        }

        container.innerHTML = "";

        if (!user || !user.is_vendor) {
            const registerBtn = createElement("button", {
                type: "button",
                id: "register-vendor-btn",
                class: "btn-primary",
                events: {
                    click: () => {
                        openVendorRegistration(async () => {
                            await showVendorProfile(userId, container);
                        });
                    }
                }
            }, "Register as Vendor");

            const profile = createElement("div", { class: "no-vendor-profile" }, [
                createElement("h3", {}, "Become a Vendor"),
                createElement("p", {}, "Register as a vendor to start offering your services for events"),
                registerBtn
            ]);

            container.appendChild(profile);
            return;
        }

        const vendorData = user.vendor_profile || {};
        const vendorId = getVendorId(vendorData);

        const profile = createElement("div", { class: "vendor-profile" }, [
            createElement("h3", {}, "Your Vendor Profile"),
            createProfileField("Category:", vendorData.category || "—"),
            createProfileField("Rating:", `⭐ ${vendorData.rating || "Not rated yet"}`),
            createProfileField("Status:", vendorData.verified ? "✓ Verified" : "Pending verification")
        ]);

        const editBtn = createElement("button", {
            type: "button",
            id: "edit-vendor-btn",
            class: "btn-secondary",
            events: {
                click: () => {
                    openEditVendorProfile(userId, vendorData, async () => {
                        await showVendorProfile(userId, container);
                    });
                }
            }
        }, "Edit Profile");

        const actions = createElement("div", { class: "vendor-profile-actions" }, [editBtn]);

        if (vendorId) {
            const deleteBtn = createElement("button", {
                type: "button",
                class: "btn-danger",
                events: {
                    click: async () => {
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
                    }
                }
            }, "Delete Vendor Profile");

            actions.appendChild(deleteBtn);
        }

        profile.appendChild(actions);
        container.appendChild(profile);

        if (vendorId) {
            const requestsContainer = createElement("div", { class: "vendor-requests-list" });
            const requestsSection = createElement("div", { class: "vendor-requests-section" }, [
                createElement("h3", {}, "Incoming Vendor Requests"),
                requestsContainer
            ]);

            container.appendChild(requestsSection);
            await refreshVendorRequests(requestsContainer);
        }
    } catch (error) {
        console.error("Error loading vendor profile:", error);
        container.innerHTML = "";
        container.appendChild(createElement("p", {}, "Error loading profile"));
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
            container.appendChild(
                createElement("div", { class: "vendor-requests-empty" }, "No incoming request at this time.")
            );
            return;
        }

        for (const request of requests) {
            const statusText = formatVendorRequestStatus(request.status);
            const statusBadge = createElement("span", {
                class: `vendor-request-status status-${(request.status || "unknown").toLowerCase()}`
            }, statusText);

            const requestCard = createElement("div", { class: "vendor-request-card" }, [
                createElement("div", { class: "vendor-request-title" }, `Event: ${request.eventid || request.eventId || "Unknown"}`),
                statusBadge,
                createElement("div", { class: "vendor-request-details" }, `Requested by: ${request.hiredby || request.hiredBy || "Unknown organizer"}`)
            ]);

            if (String(request.status || "").toLowerCase() === "pending") {
                const acceptBtn = createElement("button", {
                    type: "button",
                    class: "btn-primary vendor-request-accept",
                    events: {
                        click: async () => {
                            await handleVendorRequestAction(request, "accepted", acceptBtn, rejectBtn, container);
                        }
                    }
                }, "Accept");

                const rejectBtn = createElement("button", {
                    type: "button",
                    class: "btn-danger vendor-request-reject",
                    events: {
                        click: async () => {
                            await handleVendorRequestAction(request, "rejected", acceptBtn, rejectBtn, container);
                        }
                    }
                }, "Reject");

                const actions = createElement("div", { class: "vendor-request-actions" }, [acceptBtn, rejectBtn]);
                requestCard.appendChild(actions);
            }

            container.appendChild(requestCard);
        }
    } catch (error) {
        console.error("Error loading vendor requests:", error);
        container.appendChild(
            createElement("div", { class: "vendor-requests-error" }, "Unable to load your vendor requests.")
        );
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
    return createElement("div", { class: "profile-field" }, [
        createElement("label", {}, labelText),
        createElement("span", {}, valueText)
    ]);
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
            const actions = createElement("div", { class: "vendor-edit-actions" });

            const availabilityList = createElement("div", { class: "vendor-availability-list" });

            const availabilityForm = createElement("form", {
                class: "vendor-availability-form",
                events: {
                    submit: async (event) => {
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
                    }
                }
            });

            // Populate Form Template Declaratively
            availabilityForm.appendChild(createElement("div", { class: "form-row" }, [
                createElement("label", {}, "Start Date"),
                createElement("input", { type: "date", name: "start_date", required: "true" })
            ]));
            availabilityForm.appendChild(createElement("div", { class: "form-row" }, [
                createElement("label", {}, "End Date"),
                createElement("input", { type: "date", name: "end_date", required: "true" })
            ]));
            availabilityForm.appendChild(createElement("div", { class: "form-row" }, [
                createElement("label", {}, "Notes"),
                createElement("input", { type: "text", name: "notes", placeholder: "Optional note" })
            ]));
            availabilityForm.appendChild(createElement("button", { type: "submit", class: "btn-primary" }, "Add Slot"));

            const reserveSection = createElement("div", { class: "vendor-availability-section" }, [
                createElement("h4", {}, "Availability Slots"),
                availabilityList,
                availabilityForm
            ]);

            actions.appendChild(reserveSection);

            const deleteBtn = createElement("button", {
                type: "button",
                class: "btn-danger",
                events: {
                    click: async () => {
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
                    }
                }
            }, "Delete Vendor Profile");

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
                        availabilityList.innerHTML = "";
                        availabilityList.appendChild(createElement("p", {}, "No availability slots yet."));
                        return;
                    }

                    availabilityList.innerHTML = "";
                    for (const slot of slots) {
                        const removeBtn = createElement("button", {
                            type: "button",
                            class: "btn-link btn-small",
                            events: {
                                click: async () => {
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
                                }
                            }
                        }, "Remove");

                        const slotLabel = `${slot.start_date} → ${slot.end_date}` + (slot.notes ? ` — ${slot.notes}` : "");
                        const slotRow = createElement("div", { class: "availability-slot-row" }, [
                            createElement("div", { class: "availability-slot-label" }, slotLabel),
                            removeBtn
                        ]);

                        availabilityList.appendChild(slotRow);
                    }
                } catch (error) {
                    availabilityList.innerHTML = "";
                    availabilityList.appendChild(createElement("p", {}, "Failed to load availability."));
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