import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";

/* ────────── Edit Ticket ────────── */
async function editTicket(ticketId: string, eventId: string, onRefresh?: () => void) {
    try {
        const ticketData = await apiFetch(
            `/ticket/event/${eventId}/${ticketId}`,
            "GET"
        );

        if (!ticketData || !ticketData.ticketid) {
            alert("Failed to load ticket data.");
            return;
        }

        const editEventDiv = document.getElementById("edittabs");
        if (!editEventDiv) return;

        editEventDiv.replaceChildren();

        const form = createElement("form", { id: "edit-ticket-form" }) as HTMLFormElement;

        const fields = [
            { label: "Name", id: "ticket-name", type: "text", value: ticketData.name },
            { label: "Price (minor unit)", id: "ticket-price", type: "number", value: ticketData.price },
            { label: "Quantity", id: "ticket-quantity", type: "number", value: ticketData.quantity },
            { label: "Seat Start", id: "seat-start", type: "number", value: ticketData.seatstart || 0 },
            { label: "Seat End", id: "seat-end", type: "number", value: ticketData.seatend || ticketData.quantity },
            { label: "Color", id: "ticket-color", type: "color", value: ticketData.color || "#ffffff" }
        ];

        fields.forEach(f => {
            const group = createElement("div", { class: "form-group" });
            group.append(
                createElement("label", { for: f.id }, [f.label]),
                createElement("input", {
                    id: f.id,
                    type: f.type,
                    value: f.value,
                    required: true
                })
            );
            form.append(group);
        });

        /* Currency */
        const currencyGroup = createElement("div", { class: "form-group" });
        const currencySelect = createElement("select", {
            id: "ticket-currency",
            required: true
        });

        ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].forEach(c => {
            const opt = createElement("option", { value: c }, [c]) as HTMLOptionElement;
            if (ticketData.currency === c) {
                opt.selected = true;
            }
            currencySelect.append(opt);
        });

        currencyGroup.append(
            createElement("label", { for: "ticket-currency" }, ["Currency"]),
            currencySelect
        );

        const submitBtn = createElement(
            "button",
            { type: "submit", class: "buttonx primary" },
            ["Update Ticket"]
        );

        const cancelBtn = createElement(
            "button",
            { type: "button", class: "buttonx" },
            ["Cancel"]
        );

        cancelBtn.addEventListener("click", clearTicketForm);

        form.append(currencyGroup, submitBtn, cancelBtn);
        editEventDiv.append(
            createElement("h3", {}, ["Edit Ticket"]),
            form
        );

        form.addEventListener("submit", async e => {
            e.preventDefault();
            await updateTicket(ticketId, eventId, onRefresh);
        });
    } catch (err) {
        console.error(err);
        alert("Error loading ticket.");
    }
}

/* ────────── Update Ticket ────────── */
async function updateTicket(ticketId: string, eventId: string, onRefresh?: () => void) {
    const payload = {
        name: (document.getElementById("ticket-name") as HTMLInputElement).value.trim(),
        price: Number((document.getElementById("ticket-price") as HTMLInputElement).value),
        quantity: Number((document.getElementById("ticket-quantity") as HTMLInputElement).value),
        currency: (document.getElementById("ticket-currency") as HTMLSelectElement).value,
        color: (document.getElementById("ticket-color") as HTMLInputElement).value,
        seatstart: Number((document.getElementById("seat-start") as HTMLInputElement).value),
        seatend: Number((document.getElementById("seat-end") as HTMLInputElement).value)
    };

    if (
        !payload.name ||
        payload.price <= 0 ||
        payload.quantity <= 0 ||
        payload.seatstart > payload.seatend
    ) {
        alert("Invalid ticket data.");
        return;
    }

    try {
        await apiFetch(
            `/ticket/event/${eventId}/${ticketId}`,
            "PUT",
            payload
        );

        clearTicketForm();
        triggerRefresh(onRefresh);
    } catch (err) {
        console.error(err);
        alert("Failed to update ticket.");
    }
}

/* ────────── Helpers ────────── */
function clearTicketForm() {
    const editEventDiv = document.getElementById("edittabs");
    if (editEventDiv) editEventDiv.replaceChildren();
}

function triggerRefresh(onRefresh?: () => void) {
    if (typeof onRefresh === "function") {
        onRefresh();
    } else {
        document.dispatchEvent(new CustomEvent("tickets:updated"));
    }
}

/* ────────── Delete Ticket ────────── */
async function deleteTicket(ticketId: string, eventId: string, onRefresh?: () => void) {
    if (!confirm("Delete this ticket?")) {
        return;
    }

    try {
        await apiFetch(
            `/ticket/event/${eventId}/${ticketId}`,
            "DELETE"
        );

        triggerRefresh(onRefresh);
    } catch (err) {
        console.error(err);
        alert("Failed to delete ticket.");
    }
}

export { clearTicketForm, deleteTicket, editTicket };