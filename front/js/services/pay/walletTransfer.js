import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { formatCurrency } from "../../types/api.types.ts";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";
import Notify from "../../components/ui/Notify.mjs";

function parseAmountToPaise(value) {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount <= 0) return 0;
    // Defends against precision truncation flaws on base-10 systems
    return Math.round((amount + Number.EPSILON) * 100);
}

export function WalletTransfer({ onBalanceChange }) {
    // Unique session-persistent key for peer transfer execution stability
    let transferIdempotencyKey = uuidv4();

    const recipientInput = createElement("input", {
        type: "text",
        id: "transfer-recipient",
        placeholder: "Recipient Account ID or Email",
        class: "form-input"
    });

    const amountInput = createElement("input", {
        type: "number",
        id: "transfer-amount",
        placeholder: "Amount (INR)",
        min: "1",
        step: "0.01",
        class: "form-input"
    });

    const noteInput = createElement("input", {
        type: "text",
        id: "transfer-note",
        placeholder: "Optional transfer note...",
        maxLength: "120",
        class: "form-input"
    });

    const transferBtn = Button("Send Balance", "btn-transfer-submit", {
        click: async () => {
            const recipient = recipientInput.value?.trim();
            const amountPaise = parseAmountToPaise(amountInput.value);
            const note = noteInput.value?.trim();

            if (!recipient) {
                return Notify("A valid destination identifier is required", { type: "warning" });
            }

            if (amountPaise <= 0) {
                return Notify("Please state a transfer amount above ₹0.00", { type: "warning" });
            }

            transferBtn.disabled = true;
            transferBtn.textContent = "Transferring Safely...";

            try {
                const res = await apiFetch("/wallet/transfer", "POST", 
                    { 
                        recipient_id: recipient, 
                        amount: amountPaise, 
                        note: note || undefined 
                    }, 
                    { 
                        headers: { "Idempotency-Key": transferIdempotencyKey } 
                    }
                );

                if (res?.success) {
                    Notify(res.message || `Transferred ${formatCurrency(amountPaise)} successfully`, { type: "success" });
                    
                    // Cycle tracking token token only upon concrete structural confirmations
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
            } catch (err) {
                console.error("Critical balance distribution path error:", err);
                Notify(err.message || "Failed to finalize balance delivery validation loop", { type: "error" });
            } finally {
                transferBtn.disabled = false;
                transferBtn.textContent = "Send Balance";
            }
        }
    });

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