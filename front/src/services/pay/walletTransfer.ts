import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { formatCurrency, Paise, toPaise } from "../../types/api.types.js";
import { v4 as uuidv4 } from "uuid";
import Notify from "../../components/ui/Notify.js";
import { transferWallet } from "./api.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces */
/* ───────────────────────────────────────── */

export interface WalletTransferProps {
  onBalanceChange?: () => void | Promise<void>;
}

export interface WalletTransferResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/* ───────────────────────────────────────── */
/* Utility Functions */
/* ───────────────────────────────────────── */

function parseAmountToPaise(value: string): Paise {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount <= 0) return 0 as Paise;
  // Defends against precision truncation flaws on base-10 systems
  return toPaise(amount);
}

/* ───────────────────────────────────────── */
/* Component Implementation */
/* ───────────────────────────────────────── */

export function WalletTransfer({ onBalanceChange }: WalletTransferProps): HTMLElement {
  // Unique session-persistent key for peer transfer execution stability
  let transferIdempotencyKey: string = uuidv4();

  const recipientInput = createElement("input", {
    type: "text",
    id: "transfer-recipient",
    placeholder: "Recipient Account ID or Email",
    class: "form-input"
  }) as HTMLInputElement;

  const amountInput = createElement("input", {
    type: "number",
    id: "transfer-amount",
    placeholder: "Amount (INR)",
    min: "1",
    step: "0.01",
    class: "form-input"
  }) as HTMLInputElement;

  const noteInput = createElement("input", {
    type: "text",
    id: "transfer-note",
    placeholder: "Optional transfer note...",
    maxLength: "120",
    class: "form-input"
  }) as HTMLInputElement;

  const transferBtn = Button({
    title: "Send Balance",
    classes: "btn-transfer-submit",
    events: {
      click: async () => {
        const recipient = recipientInput.value?.trim();
        const amountPaise = parseAmountToPaise(amountInput.value);
        const note = noteInput.value?.trim();

        if (!recipient) {
          Notify("A valid destination identifier is required", { type: "warning" });
          return;
        }

        if (amountPaise <= 0) {
          Notify("Please state a transfer amount above ₹0.00", { type: "warning" });
          return;
        }

        transferBtn.disabled = true;
        transferBtn.textContent = "Transferring Safely...";

        try {
          const res = await transferWallet(
            {
              recipient_id: recipient,
              amount: amountPaise,
              note: note || undefined
            },
            transferIdempotencyKey
          );

          if (res?.success) {
            Notify(res.message || `Transferred ${formatCurrency(amountPaise)} successfully`, { type: "success" });
            
            // Cycle tracking token only upon concrete structural confirmations
            transferIdempotencyKey = uuidv4();
            amountInput.value = "";
            recipientInput.value = "";
            noteInput.value = "";

            if (onBalanceChange) {
              await onBalanceChange();
            }
          } else {
            Notify(res?.message || "Transfer declaration declined by payment router", { type: "error" });
          }
        } catch (err: unknown) {
          console.error("Critical balance distribution path error:", err);
          const errorMessage = err instanceof Error ? err.message : "Failed to finalize balance delivery validation loop";
          Notify(errorMessage, { type: "error" });
        } finally {
          transferBtn.disabled = false;
          transferBtn.textContent = "Send Balance";
        }
      }
    }
  }) as HTMLButtonElement;

  return createElement("div", { id: "wallet-transfer-panel", class: "wallet-card" }, [
    createElement("h3", { class: "wallet-section-title" }, ["Peer to Peer Transfer"]),
    createElement("div", { class: "wallet-form grid-layout" }, [
      recipientInput,
      amountInput,
      noteInput,
      transferBtn
    ])
  ]);
}