import { createElement, ChildInput } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import {
  fetchTicketData,
  updateTicketRequest,
  deleteTicketRequest,
  type TicketData,
  type TicketPayload
} from "./api.js";

/* ────────── Edit Ticket ────────── */
async function editTicket(
  ticketId: string | number,
  eventId: string | number,
  onRefresh?: () => void
): Promise<void> {
  try {
    const ticketData = await fetchTicketData(ticketId, eventId);

    if (!ticketData || !ticketData.ticketid) {
      alert("Failed to load ticket data.");
      return;
    }

    const editEventDiv = document.getElementById("edittabs");
    if (!editEventDiv) return;

    editEventDiv.replaceChildren();

    const form = createElement("form", { id: "edit-ticket-form" }, []) as HTMLFormElement;

    const fields = [
      { label: "Name", id: "ticket-name", type: "text", value: String(ticketData.name ?? "") },
      { label: "Price (minor unit)", id: "ticket-price", type: "number", value: String(ticketData.price ?? 0) },
      { label: "Quantity", id: "ticket-quantity", type: "number", value: String(ticketData.quantity ?? 0) },
      { label: "Seat Start", id: "seat-start", type: "number", value: String(ticketData.seatstart ?? 0) },
      { label: "Seat End", id: "seat-end", type: "number", value: String(ticketData.seatend ?? ticketData.quantity ?? 0) },
      { label: "Color", id: "ticket-color", type: "color", value: ticketData.color || "#ffffff" }
    ];

    fields.forEach((f) => {
      const group = createElement("div", { class: "form-group" }, [
        createElement("label", { for: f.id }, [f.label]),
        createElement("input", {
          id: f.id,
          type: f.type,
          value: f.value,
          required: true
        })
      ]);
      form.append(group);
    });

    /* Currency Select */
    const currencySelect = createElement("select", {
      id: "ticket-currency",
      required: true
    }) as HTMLSelectElement;

    const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
    currencies.forEach((c) => {
      const opt = createElement("option", { value: c }, [c]) as HTMLOptionElement;
      if (ticketData.currency === c) {
        opt.selected = true;
      }
      currencySelect.append(opt);
    });

    const currencyGroup = createElement("div", { class: "form-group" }, [
      createElement("label", { for: "ticket-currency" }, ["Currency"]),
      currencySelect
    ]);

    /* Action Buttons via standard Button component */
    const submitBtn = Button({
      title: "Update Ticket",
      classes: "buttonx primary",
      events: {
        click: (e: MouseEvent) => {
          e.preventDefault();
          form.requestSubmit();
        }
      }
    });

    const cancelBtn = Button({
      title: "Cancel",
      classes: "buttonx",
      events: {
        click: clearTicketForm
      }
    });

    const actionContainer = createElement(
      "div",
      { style: { display: "flex", gap: "8px", marginTop: "12px" } },
      [submitBtn, cancelBtn]
    );

    form.append(currencyGroup, actionContainer);

    editEventDiv.append(
      createElement("h3", {}, ["Edit Ticket"]),
      form
    );

    form.addEventListener("submit", async (e: Event) => {
      e.preventDefault();
      await updateTicket(ticketId, eventId, onRefresh);
    });
  } catch (err) {
    console.error(err);
    alert("Error loading ticket.");
  }
}

/* ────────── Update Ticket ────────── */
async function updateTicket(
  ticketId: string | number,
  eventId: string | number,
  onRefresh?: () => void
): Promise<void> {
  const nameInput = document.getElementById("ticket-name") as HTMLInputElement | null;
  const priceInput = document.getElementById("ticket-price") as HTMLInputElement | null;
  const quantityInput = document.getElementById("ticket-quantity") as HTMLInputElement | null;
  const currencySelect = document.getElementById("ticket-currency") as HTMLSelectElement | null;
  const colorInput = document.getElementById("ticket-color") as HTMLInputElement | null;
  const seatStartInput = document.getElementById("seat-start") as HTMLInputElement | null;
  const seatEndInput = document.getElementById("seat-end") as HTMLInputElement | null;

  const payload: TicketPayload = {
    name: nameInput?.value.trim() ?? "",
    price: Number(priceInput?.value ?? 0),
    quantity: Number(quantityInput?.value ?? 0),
    currency: currencySelect?.value ?? "USD",
    color: colorInput?.value ?? "#ffffff",
    seatstart: Number(seatStartInput?.value ?? 0),
    seatend: Number(seatEndInput?.value ?? 0)
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
    await updateTicketRequest(ticketId, eventId, payload);

    clearTicketForm();
    triggerRefresh(onRefresh);
  } catch (err) {
    console.error(err);
    alert("Failed to update ticket.");
  }
}

/* ────────── Helpers ────────── */
function clearTicketForm(): void {
  const editEventDiv = document.getElementById("edittabs");
  if (editEventDiv) editEventDiv.replaceChildren();
}

function triggerRefresh(onRefresh?: () => void): void {
  if (typeof onRefresh === "function") {
    onRefresh();
  } else {
    document.dispatchEvent(new CustomEvent("tickets:updated"));
  }
}

/* ────────── Delete Ticket ────────── */
async function deleteTicket(
  ticketId: string | number,
  eventId: string | number,
  onRefresh?: () => void
): Promise<void> {
  if (!confirm("Delete this ticket?")) {
    return;
  }

  try {
    await deleteTicketRequest(ticketId, eventId);

    triggerRefresh(onRefresh);
  } catch (err) {
    console.error(err);
    alert("Failed to delete ticket.");
  }
}

export { clearTicketForm, deleteTicket, editTicket };