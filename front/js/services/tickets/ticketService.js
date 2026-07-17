import { apiFetch } from "../../api/api.js";
import { clearTicketForm } from "./editTicket.js";
import { displayNewTicket } from "./displayTickets.js";
import Modal from "../../components/ui/Modal.mjs";
import Notify from "../../components/ui/Notify.mjs";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { createFormGroup } from "../../components/createFormGroupEnhanced.js";

/* ────────── Add Ticket API ────────── */
async function addTicket(eventId, ticketList, modalInstance) {
    const payload = {
        name: document.getElementById("ticket-name").value.trim(),
        price: Number(document.getElementById("ticket-price").value),
        quantity: Number(document.getElementById("ticket-quantity").value),
        currency: document.getElementById("ticket-currency").value,
        color: document.getElementById("ticket-color").value || "#f3f3f3",
        seatstart: Number(document.getElementById("seat-start").value || 0),
        seatend: Number(document.getElementById("seat-end").value || 0)
    };

    if (
        !payload.name ||
        payload.price <= 0 ||
        payload.quantity <= 0 ||
        payload.seatstart > payload.seatend
    ) {
        Notify("Please enter valid ticket details.", { type: "warning", dismissible: true, duration: 3000 });
        return;
    }

    try {
        const ticket = await apiFetch(`/ticket/event/${eventId}`, "POST", payload);

        if (ticket && ticket.ticketid) {
            Notify("Ticket added successfully.", { type: "success", dismissible: true, duration: 3000 });

            displayNewTicket(ticket, ticketList, true, true, eventId);

            clearTicketForm();
            if (modalInstance && typeof modalInstance.close === "function") {
                modalInstance.close();
            }
        } else {
            Notify("Failed to add ticket.", { type: "error", dismissible: true });
        }
    } catch (err) {
        console.error(err);
        Notify("Error adding ticket.", { type: "error", dismissible: true });
    }
}

/* ────────── Add Ticket Form ────────── */
function addTicketForm(eventId, ticketList) {
    const form = createElement("form", { id: "add-ticket-form" });

    const fields = [
        { label: "Ticket Name", type: "text", id: "ticket-name", required: true },
        { label: "Ticket Price (minor unit)", type: "number", id: "ticket-price", required: true },
        { label: "Quantity", type: "number", id: "ticket-quantity", required: true },
        { label: "Seat Start", type: "number", id: "seat-start" },
        { label: "Seat End", type: "number", id: "seat-end" }
    ];

    fields.forEach(f => form.append(createFormGroup(f)));

    /* Currency Dropdown Setup */
    const currencySelect = createElement("select", {
        id: "ticket-currency",
        required: true
    });

    // Added INR to the option stack to map correctly to the standard currency formatting rule
    ["INR", "USD", "EUR", "GBP", "CAD", "AUD", "JPY"].forEach(c =>
        currencySelect.append(createElement("option", { value: c }, [c]))
    );

    form.append(
        createElement("div", { class: "form-group" }, [
            createElement("label", { for: "ticket-currency" }, ["Currency"]),
            currencySelect
        ])
    );

    /* Color Selection */
    form.append(
        createElement("div", { class: "form-group" }, [
            createElement("label", { for: "ticket-color" }, ["Ticket Color"]),
            createElement("input", {
                id: "ticket-color",
                type: "color",
                value: "#f3f3f3"
            })
        ])
    );

    // Single assignments setup to avoid re-instantiation assignment runtime blowups
    const modal = Modal({
        title: "Add Ticket",
        content: form
    });

    const submitBtn = Button("Add Ticket", "", {}, "buttonx primary");
    submitBtn.type = "submit";

    const cancelBtn = Button(
        "Cancel",
        "",
        { click: () => modal.close() },
        "buttonx"
    );

    form.append(submitBtn, cancelBtn);

    form.addEventListener("submit", e => {
        e.preventDefault();
        // Safe reference scoping passing the parent modal reference cleanly down
        addTicket(eventId, ticketList, modal);
    });
}

export { addTicketForm, addTicket };