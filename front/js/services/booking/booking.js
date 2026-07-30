import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/createFormGroupEnhanced.js";
import Notify from "../../components/ui/Notify.mjs";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import { genId, bookingStorage, bookingApi } from "./bookingApi.js";

// ---------- Helpers ----------
function confirmAction(message, action) {
    if (window.confirm(message)) {
        return action();
    }
}

function notifyError(reason, map = {}) {
    const msg = map?.[reason] || "Operation failed. Please try again.";
    Notify(msg, { type: "error", duration: 3000 });
}

function notifySuccess(msg, duration = 2000) {
    Notify(msg, { type: "success", duration });
}

function withRefresh(action, refreshers = []) {
    return async (...args) => {
        const ok = await action(...args);
        if (ok) {
            for (const fn of refreshers) {
                await fn();
            }
        }
    };
}

// ---------- Bookings list ----------
function createBookingsList(api, userId, isAdmin) {
    const bookingsList = createElement("section", { class: "bookings-list-container" }, []);
    let showCancelled = false;

    async function renderBookings() {
        bookingsList.replaceChildren();
        let bookings = [];
        try {
            bookings = await api.apiListBookings();
        } catch (err) {
            bookingsList.appendChild(createElement("div", { class: "error-state" }, ["Failed to load bookings."]));
            return;
        }

        if (!bookings.length) {
            bookingsList.appendChild(createElement("div", { class: "empty-state" }, ["No bookings registered yet."]));
            return;
        }

        const activeBookings = bookings.filter(b => b.status !== "cancelled");
        bookings.sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
        const userIds = [...new Set(bookings.map(b => b.userId))].filter(id => id && id !== "guest");
        const userMeta = await fetchUserMeta(userIds);
        const totalSeats = activeBookings.reduce((s, b) => s + (b.seats || 1), 0);

        const toggle = createElement("button", {
            type: "button",
            class: "btn btn-small secondary",
            events: {
                click: () => {
                    showCancelled = !showCancelled;
                    renderBookings();
                }
            }
        }, [showCancelled ? "Hide Cancelled" : "View Cancelled Bookings"]);

        const header = createElement("header", { class: "booking-header" }, [
            createElement("h3", {}, [`Total Bookings: ${activeBookings.length} — Slots: ${totalSeats}`]),
            toggle
        ]);
        
        bookingsList.appendChild(header);

        const listContainer = createElement("ul", { class: "bookings-ul" });

        bookings.forEach((b, idx) => {
            if (!showCancelled && b.status === "cancelled") {
                return;
            }

            const isCurrentUser = b.userId === userId;
            const username = b.userId === "guest" ? "Guest" : (userMeta[b.userId]?.username || b.userId);
            const timeRange = b.end && b.end !== b.start ? `${b.start} - ${b.end}` : b.start;
            const seatsNote = (b.seats && b.seats > 1) ? ` (${b.seats} seats)` : "";
            const statusNote = b.status === "cancelled" ? " [CANCELLED]" : "";
            const tierNote = b.tierName ? ` — Tier: ${b.tierName}` : "";
            const label = `${idx + 1}. ${username} — ${b.date} @ ${timeRange}${seatsNote}${statusNote}${tierNote}`;

            const itemChildren = [createElement("span", {}, [label])];

            if (isCurrentUser && !isAdmin && b.status !== "cancelled") {
                const cancelBtn = createElement("button", {
                    type: "button",
                    class: "btn btn-small btn-danger",
                    events: {
                        click: () => confirmAction(
                            `Cancel your booking on ${b.date} at ${timeRange}?`,
                            withRefresh(
                                async () => {
                                    try {
                                        const res = await api.apiCancelBooking(b.id);
                                        if (res) {
                                            notifySuccess("Booking cancelled");
                                            return true;
                                        }
                                    } catch (e) {
                                        notifyError();
                                    }
                                    return false;
                                },
                                [renderBookings]
                            )
                        )
                    }
                }, ["Cancel"]);

                itemChildren.push(createElement("div", { class: "slot-actions" }, [cancelBtn]));
            }

            const item = createElement("li", {
                class: `booking-item${isCurrentUser ? " booking-item-current" : ""}${b.status === "cancelled" ? " booking-item-cancelled" : ""}`
            }, itemChildren);

            listContainer.appendChild(item);
        });

        bookingsList.appendChild(listContainer);
    }

    return { bookingsList, renderBookings };
}

// ---------- Tier Management (Admin) ----------
function renderTierManager(api, container, refreshSlots, entityType, entityId, onTierChange) {
    const tierList = createElement("div", { class: "tier-list" });

    async function refreshTiers() {
        tierList.replaceChildren();
        const tiers = await api.apiListTiers();
        if (!tiers.length) {
            tierList.appendChild(createElement("div", { class: "empty-state" }, ["No pricing tiers defined yet."]));
            return;
        }

        tiers.forEach(tier => {
            const delBtn = createElement("button", {
                type: "button",
                class: "btn btn-small btn-danger",
                events: {
                    click: () => confirmAction(
                        "Delete this tier and all associated slots?",
                        withRefresh(
                            async () => {
                                await api.apiDeleteTier(tier.id);
                                notifySuccess("Tier deleted");
                                onTierChange?.();
                                return true;
                            },
                            [refreshTiers, refreshSlots]
                        )
                    )
                }
            }, ["Delete"]);

            const item = createElement("div", { class: "tier-item" }, [
                createElement("span", {}, [`${tier.name} — $${tier.price}/seat — cap ${tier.capacity}`]),
                delBtn
            ]);
            tierList.appendChild(item);
        });
    }

    // Forms configuration
    const nameInput = createFormGroup({ label: "Tier Name", id: "tier-name", type: "text", placeholder: "Tier name", required: true });
    const priceInput = createFormGroup({ label: "Price ($)", id: "tier-price", type: "number", value: 10, placeholder: "Price", min: 0 });
    const capInput = createFormGroup({ label: "Capacity per Slot", id: "tier-capacity", type: "number", value: 20, placeholder: "Capacity", min: 1 });
    const addBtn = createElement("button", { type: "submit", class: "btn btn-primary" }, ["Add Tier"]);

    const form = createElement("form", {
        class: "tier-form",
        events: {
            submit: withRefresh(async (e) => {
                e.preventDefault();
                const tier = {
                    id: genId(),
                    entityType,
                    entityId,
                    name: form.querySelector("#tier-name").value || "Untitled",
                    price: Math.max(0, parseFloat(form.querySelector("#tier-price").value || "0")),
                    capacity: Math.max(1, parseInt(form.querySelector("#tier-capacity").value || "1", 10)),
                    timeRange: ["09:00", "17:00"],
                    daysOfWeek: [1, 2, 3, 4, 5],
                    features: [],
                    createdAt: Date.now()
                };
                await api.apiCreateTier(tier);
                notifySuccess("Tier added");
                form.reset();
                onTierChange?.();
                return true;
            }, [refreshTiers])
        }
    }, [nameInput, priceInput, capInput, addBtn]);

    const tierSection = createElement("section", { class: "tier-manager-section" }, [
        createElement("h3", {}, ["Pricing Tiers"]),
        form,
        tierList
    ]);

    container.appendChild(tierSection);
    refreshTiers();
}

// ---------- Admin UI ----------
function renderAdminUi(api, storage, modalContent, refreshBookings, entityType, entityId) {
    const adminSlotsContainer = createElement("div", { class: "admin-slots-container" }, []);

    const renderAdminSlots = async () => {
        adminSlotsContainer.replaceChildren();
        const [slots, bookings] = await Promise.all([api.apiListSlots(), api.apiListBookings()]);

        if (!slots.length) {
            adminSlotsContainer.appendChild(createElement("div", { class: "empty-state" }, ["No booking slots defined yet."]));
            return;
        }

        slots.sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
        slots.forEach(slot => {
            const bookedSeats = bookings
                .filter(b => b.slotId === slot.id)
                .reduce((s, bb) => s + (bb.seats || 1), 0);

            const label = `${slot.date} • ${slot.start}${slot.end ? ` - ${slot.end}` : ""} — ${bookedSeats}/${slot.capacity} [${slot.tierName || "no tier"}]`;

            const delBtn = createElement("button", {
                type: "button",
                class: "btn btn-small btn-danger",
                events: {
                    click: () => confirmAction(
                        "Delete this slot and associated bookings?",
                        withRefresh(
                            async () => {
                                const ok = await api.apiDeleteSlot(slot.id);
                                if (ok) {
                                    notifySuccess("Slot deleted", 1600);
                                    return true;
                                }
                                notifyError();
                                return false;
                            },
                            [renderAdminSlots, refreshBookings]
                        )
                    )
                }
            }, ["Delete"]);

            const item = createElement("div", { class: "slot-row" }, [
                createElement("div", { class: "slot-label" }, [label]),
                createElement("div", { class: "slot-actions" }, [delBtn])
            ]);

            adminSlotsContainer.appendChild(item);
        });
    };

    // Slot generation form
    const tierSelect = createFormGroup({ type: "select", id: "tier-select", label: "Select Tier", required: true });
    const dateRangeStart = createFormGroup({ type: "date", id: "date-start", label: "Start Date", required: true });
    const dateRangeEnd = createFormGroup({ type: "date", id: "date-end", label: "End Date", required: true });
    const genBtn = createElement("button", { type: "submit", class: "btn btn-primary" }, ["Generate Slots"]);

    const tierGenForm = createElement("form", {
        class: "slot-gen-panel",
        events: {
            submit: withRefresh(async (e) => {
                e.preventDefault();
                const tierId = tierGenForm.querySelector("#tier-select").value;
                const start = dateRangeStart.querySelector("input").value;
                const end = dateRangeEnd.querySelector("input").value;

                if (new Date(start) > new Date(end)) {
                    notifyError("invalid-dates", { "invalid-dates": "Start Date must be prior to End Date" });
                    return false;
                }

                await api.apiGenerateSlotsFromTier(tierId, start, end);
                notifySuccess("Slots generated");
                return true;
            }, [renderAdminSlots])
        }
    }, [tierSelect, dateRangeStart, dateRangeEnd, genBtn]);

    const adminSection = createElement("section", { class: "admin-dashboard" }, [
        adminSlotsContainer,
        tierGenForm
    ]);

    modalContent.appendChild(adminSection);

    async function refreshTierDropdown() {
        const select = tierSelect.querySelector("select");
        select.replaceChildren(createElement("option", { value: "" }, ["Choose a tier"]));
        const tiers = await api.apiListTiers();
        tiers.forEach(t => {
            const opt = createElement("option", { value: t.id }, [t.name]);
            select.appendChild(opt);
        });
    }

    renderTierManager(api, modalContent, renderAdminSlots, entityType, entityId, refreshTierDropdown);
    refreshTierDropdown();
    renderAdminSlots();
}

// ---------- User UI ----------
function renderUserUi(api, storage, modalContent, userId, refreshBookings, entityType, entityId) {
    const slotsContainer = createElement("div", { "data-slots-container": "true", class: "slots-container" }, []);
    modalContent.appendChild(slotsContainer);

    function renderTierBookingSection(tiers, bookings) {
        if (!tiers.length) {
            return createElement("section", { class: "tier-booking-section" }, [
                createElement("h3", {}, ["Book by Tier"]),
                createElement("div", { class: "empty-state" }, ["No tiers available for booking."])
            ]);
        }

        const tierRows = tiers.map(tier => {
            const bookedSeats = bookings
                .filter(b => b.tierId === tier.id && b.status !== "cancelled")
                .reduce((s, bb) => s + (bb.seats || 1), 0);
            const rem = Math.max(0, (tier.capacity || 0) - bookedSeats);

            const dateInput = createFormGroup({ type: "date", id: `tier-date-${tier.id}`, label: "Date", required: true });
            const seatsInput = createFormGroup({
                type: "number",
                id: `tier-seats-${tier.id}`,
                label: "Seats",
                value: 1,
                additionalProps: { min: 1, max: rem > 0 ? rem : 1, class: "small-input input" }
            });

            const bookBtn = createElement("button", {
                type: "submit",
                class: `btn btn-small ${rem <= 0 ? "btn-secondary" : "btn-primary"}`,
                disabled: rem <= 0
            }, [rem <= 0 ? "Full" : `Book Tier (${rem} left)`]);

            const form = createElement("form", {
                class: "tier-booking-form",
                events: {
                    submit: withRefresh(async (e) => {
                        e.preventDefault();
                        if (rem <= 0) return false;

                        const dateValue = form.querySelector(`#tier-date-${tier.id}`).value;
                        const seatsToBook = Math.max(
                            1,
                            Math.min(parseInt(form.querySelector(`#tier-seats-${tier.id}`).value || "1", 10), rem)
                        );

                        const payload = {
                            userId,
                            entityType,
                            entityId,
                            tierId: tier.id,
                            date: dateValue,
                            start: tier.timeRange?.[0] || "09:00",
                            end: tier.timeRange?.[1] || tier.timeRange?.[0] || "09:00",
                            seats: seatsToBook,
                            pricePaid: tier.price
                        };
                        const res = await api.apiCreateBooking(payload);
                        if (!res.ok) {
                            notifyError(res.reason, {
                                "tier-missing": "Tier no longer available.",
                                "tier-full": "This tier is fully booked for the selected date.",
                                "date-full": "Bookings are full on that date.",
                                "one-per-day": "You already have a booking on that date.",
                                "vendor-unavailable": "Vendor is unavailable on that date."
                            });
                            return false;
                        }
                        notifySuccess("Booking confirmed!");
                        return true;
                    }, [refreshBookings, refreshSlots])
                }
            }, [dateInput, seatsInput, bookBtn]);

            return createElement("div", { class: "tier-row" }, [
                createElement("div", { class: "tier-label" }, [
                    `${tier.name} — $${tier.price}/seat — ${bookedSeats}/${tier.capacity} taken` +
                    `${tier.timeRange?.[0] ? ` — ${tier.timeRange[0]}${tier.timeRange[1] ? ` - ${tier.timeRange[1]}` : ""}` : ""}`
                ]),
                form
            ]);
        });

        return createElement("section", { class: "tier-booking-section" }, [
            createElement("h3", {}, ["Book by Tier"]),
            ...tierRows
        ]);
    }

    async function refreshSlots() {
        slotsContainer.replaceChildren();
        const [slots, bookings, tiers] = await Promise.all([
            api.apiListSlots(), api.apiListBookings(), api.apiListTiers()
        ]);

        if (!slots.length) {
            slotsContainer.appendChild(createElement("div", { class: "empty-state" }, ["No predefined slots available."]));
        } else {
            slots.sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
            for (const slot of slots) {
                const tier = tiers.find(t => t.id === slot.tierId);
                const bookedSeats = bookings.filter(b => b.slotId === slot.id && b.status !== "cancelled").reduce((s, bb) => s + (bb.seats || 1), 0);
                const rem = Math.max(0, (slot.capacity || 0) - bookedSeats);

                const seatsInput = createFormGroup({
                    type: "number",
                    id: `seats-${slot.id}`,
                    label: "Seats",
                    value: 1,
                    additionalProps: { min: 1, max: rem > 0 ? rem : 1, class: "small-input input" }
                });

                const btn = createElement("button", {
                    type: "submit",
                    class: `btn btn-small ${rem <= 0 ? "btn-secondary" : "btn-primary"}`,
                    disabled: rem <= 0
                }, [rem <= 0 ? "Full" : `Book (${rem} left)`]);

                const form = createElement("form", {
                    class: "slot-actions",
                    events: {
                        submit: withRefresh(async (e) => {
                            e.preventDefault();
                            if (rem <= 0) return false;
                            const seatsToBook = Math.max(
                                1,
                                Math.min(parseInt(form.querySelector(`#seats-${slot.id}`).value || "1", 10), rem)
                            );
                            const payload = {
                                userId, entityType, entityId,
                                slotId: slot.id, date: slot.date, start: slot.start, end: slot.end || null,
                                seats: seatsToBook, tierId: slot.tierId
                            };
                            const res = await api.apiCreateBooking(payload);
                            if (!res.ok) {
                                notifyError(res.reason, {
                                    "slot-missing": "Slot no longer available.",
                                    "slot-full": "Slot is full.",
                                    "already-slot": "You already booked this slot.",
                                    "one-per-day": "You already have a booking on that date.",
                                    "tier-full": "This tier is fully booked for the selected date.",
                                    "date-full": "Bookings are full on that date.",
                                    "vendor-unavailable": "Vendor is unavailable on that date."
                                });
                                return false;
                            }
                            notifySuccess("Booking confirmed!");
                            return true;
                        }, [refreshBookings, refreshSlots])
                    }
                }, [seatsInput, btn]);

                const slotRow = createElement("div", { class: "slot-row" }, [
                    createElement("div", { class: "slot-label" }, [
                        `${slot.date} • ${slot.start}${slot.end ? ` - ${slot.end}` : ""} — ${bookedSeats}/${slot.capacity} taken — ${tier?.name || "No tier"} ($${tier?.price || 0})`
                    ]),
                    form
                ]);

                slotsContainer.appendChild(slotRow);
            }
        }

        const tierSection = renderTierBookingSection(tiers, bookings);
        slotsContainer.appendChild(tierSection);
    }

    refreshSlots();
}

// ---------- Modal ----------
function openBookingModal(api, storage, entityType, entityId, entityCategory, userId, isAdmin, refreshBookings) {
    if (document.getElementById("booking-modal")) {
        return;
    }

    const header = createElement("header", { class: "booking-modal-header" }, [
        createElement("h2", {}, [isAdmin ? `Manage Slots & Tiers for ${entityCategory || 'Entity'}` : `Book Slot for ${entityCategory || 'Entity'}`])
    ]);
    const body = createElement("div", { class: "booking-modal-body" }, []);

    let modalOverlay;
    const closeBtn = createElement("button", {
        type: "button",
        class: "btn btn-secondary",
        events: {
            click: () => {
                if (modalOverlay && modalOverlay.parentNode) {
                    modalOverlay.parentNode.removeChild(modalOverlay);
                }
            }
        }
    }, ["Close"]);

    const footer = createElement("footer", { class: "booking-modal-footer" }, [closeBtn]);

    const modal = createElement("dialog", { class: "booking-modal", open: true }, [header, body, footer]);
    modalOverlay = createElement("div", { id: "booking-modal", class: "booking-overlay" }, [modal]);

    if (isAdmin) {
        renderAdminUi(api, storage, body, refreshBookings, entityType, entityId);
    } else {
        renderUserUi(api, storage, body, userId, refreshBookings, entityType, entityId);
    }

    document.body.appendChild(modalOverlay);
}

// ---------- Main Entry ----------
export function displayBooking(
    { entityType, entityId, entityCategory, userId = "guest", isAdmin = false },
    bookingContainer
) {
    const storage = bookingStorage(entityType, entityId);
    const api = bookingApi(entityType, entityId, storage, userId);

    const { bookingsList, renderBookings } = createBookingsList(api, userId, isAdmin);

    const actionBtn = createElement("button", {
        type: "button",
        class: "btn btn-primary",
        events: {
            click: () => openBookingModal(api, storage, entityType, entityId, entityCategory, userId, isAdmin, renderBookings)
        }
    }, [isAdmin ? "Manage Slots & Tiers" : "Book Now"]);

    bookingContainer.replaceChildren();
    bookingContainer.appendChild(bookingsList);
    renderBookings();
    bookingContainer.appendChild(actionBtn);

    return { refresh: renderBookings };
}