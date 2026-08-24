import Modal from "../../components/ui/Modal.js";
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";

/* ────────── Download PDF ────────── */
const printTicketPDF = async (
  eventId: string | number,
  uniqueCode: string
): Promise<boolean> => {
  try {
    const endpoint =
      `/ticket/print/${eventId}?uniqueCode=` +
      encodeURIComponent(uniqueCode);

    const blob = await apiFetch<Blob>(
      endpoint,
      "GET",
      null,
      { responseType: "blob" }
    );

    const url = URL.createObjectURL(blob);

    const link = createElement("a", {
      href: url,
      download: `ticket-${uniqueCode}.pdf`
    }) as HTMLAnchorElement;

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error("Ticket PDF download failed:", err);
    return false;
  }
};

/* ────────── Print Ticket Flow ────────── */
const printTicket = async (eventId: string | number): Promise<void> => {
  const codeInput = createElement("input", {
    id: "unique-code",
    type: "text",
    required: true
  }) as HTMLInputElement;

  const submitBtn = Button({
    title: "Print Ticket",
    classes: "buttonx primary",
    type: "submit"
  });

  const form = createElement(
    "form",
    { class: "vflex gap10" },
    [
      createElement("label", { for: "unique-code" }, ["Enter Unique Code"]),
      codeInput,
      submitBtn
    ]
  ) as HTMLFormElement;

  const { close: closeFormModal } = Modal({
    title: "Print Your Ticket",
    content: form
  });

  form.addEventListener("submit", async (e: SubmitEvent) => {
    e.preventDefault();

    const uniqueCode = codeInput.value.trim();
    if (!uniqueCode) {
      return;
    }

    const loading = createElement(
      "p",
      {},
      ["Printing your ticket..."]
    );

    const { close: closeLoading } = Modal({
      title: "Ticket Printing",
      content: loading
    });

    const success = await printTicketPDF(eventId, uniqueCode);

    closeLoading();
    closeFormModal();

    Modal({
      title: "Ticket Result",
      content: createElement(
        "p",
        {},
        [
          success
            ? "Your ticket has been downloaded."
            : "Failed to generate ticket."
        ]
      )
    });
  });
};

export { printTicket, printTicketPDF };