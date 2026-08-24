import Modal from "../../components/ui/Modal.js";
import { apiFetch } from "../../api/api.js";
import { createElement, ChildInput } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { listMyTickets } from "./listMyTickets.js";

export type TicketAction = "verify" | "cancel" | "transfer";

/* ────────── Generic Ticket Action ────────── */
const handleTicketAction = (action: TicketAction, eventId: string | number): void => {
  const codeInput = createElement("input", {
    id: "unique-code",
    type: "text",
    required: true
  }) as HTMLInputElement;

  const children: ChildInput[] = [
    createElement("label", { for: "unique-code" }, ["Unique Code"]),
    codeInput
  ];

  let recipientInput: HTMLInputElement | undefined;
  if (action === "transfer") {
    recipientInput = createElement("input", {
      id: "recipient",
      type: "text",
      required: true
    }) as HTMLInputElement;

    children.push(
      createElement("label", { for: "recipient" }, ["Recipient"]),
      recipientInput
    );
  }

  const submitBtn = Button({
    title: action.charAt(0).toUpperCase() + action.slice(1),
    classes: "buttonx primary",
    type: "submit"
  });

  const form = createElement(
    "form",
    { class: "vflex gap10" },
    [...children, submitBtn]
  ) as HTMLFormElement;

  const { close: closeForm } = Modal({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Ticket`,
    content: form
  });

  form.addEventListener("submit", async (e: SubmitEvent) => {
    e.preventDefault();

    const uniquecode = codeInput.value.trim();
    if (!uniquecode) {
      return;
    }

    const recipient =
      action === "transfer" && recipientInput ? recipientInput.value.trim() : "";

    const loading = createElement("p", {}, [`${action} in progress...`]);
    const { close: closeLoading } = Modal({
      title: "Processing",
      content: loading
    });

    let success = false;

    try {
      if (action === "verify") {
        success = await verifyTicket(eventId, uniquecode);
      } else if (action === "cancel") {
        success = await cancelTicketApi(eventId, uniquecode);
      } else if (action === "transfer") {
        success = await transferTicketApi(eventId, uniquecode, recipient);
      }
    } catch (err) {
      console.error(err);
    }

    closeLoading();
    closeForm();

    Modal({
      title: "Result",
      content: createElement(
        "p",
        {},
        [
          success
            ? `Ticket ${action} successful.`
            : `Ticket ${action} failed.`
        ]
      )
    });

    if (success && action !== "verify") {
      listMyTickets(eventId);
    }
  });
};

/* ────────── API Calls ────────── */
const verifyTicket = async (
  eventId: string | number,
  uniquecode: string
): Promise<boolean> => {
  try {
    const res = await apiFetch<{ isvalid?: boolean }>(
      `/ticket/verify/${eventId}?uniqueCode=${encodeURIComponent(uniquecode)}`,
      "GET"
    );
    return !!res?.isvalid;
  } catch {
    return false;
  }
};

const cancelTicketApi = async (
  eventId: string | number,
  uniquecode: string
): Promise<boolean> => {
  try {
    const res = await apiFetch<{ success?: boolean }>(
      `/ticket/cancel/${eventId}`,
      "POST",
      { uniquecode }
    );
    return !!res?.success;
  } catch {
    return false;
  }
};

const transferTicketApi = async (
  eventId: string | number,
  uniquecode: string,
  recipient: string
): Promise<boolean> => {
  try {
    const res = await apiFetch<{ success?: boolean }>(
      `/ticket/transfer/${eventId}`,
      "POST",
      { uniquecode, recipient }
    );
    return !!res?.success;
  } catch {
    return false;
  }
};

/* ────────── Exports ────────── */
const verifyTicketAndShowModal = (eventId: string | number): void =>
  handleTicketAction("verify", eventId);

const cancelTicket = (eventId: string | number): void =>
  handleTicketAction("cancel", eventId);

const transferTicket = (eventId: string | number): void =>
  handleTicketAction("transfer", eventId);

export {
  verifyTicketAndShowModal,
  cancelTicket,
  transferTicket
};