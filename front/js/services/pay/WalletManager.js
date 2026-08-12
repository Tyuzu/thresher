import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import { formatCurrency } from "../../types/api.types.ts";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";
import Notify from "../../components/ui/Notify.mjs";

function parseAmountToPaise(value) {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount <= 0) return 0;
    return Math.round((amount + Number.EPSILON) * 100);
}

export function WalletManager() {
    let currentIdempotencyKey = uuidv4();

    const balanceEl = createElement("div", { id: "wallet-balance", class: "balance-display" }, ["Loading balance..."]);
    const amountInput = createElement("input", {
        type: "number",
        id: "topup-amount",
        placeholder: "Enter amount in INR",
        min: "1",
        step: "0.01"
    });

    const methodSelect = createElement("select", { id: "topup-method" }, [
        createElement("option", { value: "card" }, ["Credit/Debit Card"]),
        createElement("option", { value: "upi" }, ["UPI Ecosystem"])
    ]);

    const topupBtn = Button("Top Up Account", "topup-btn", {
        click: async () => {
            const amountPaise = parseAmountToPaise(amountInput.value);
            const method = methodSelect.value;

            if (amountPaise <= 0) {
                return Notify("Please enter a valid amount", { type: "warning" });
            }

            topupBtn.disabled = true;
            try {
                const res = await apiFetch("/wallet/topup", "POST", 
                    { amount: amountPaise, method }, 
                    { headers: { "Idempotency-Key": currentIdempotencyKey } }
                );

                if (res?.success) {
                    Notify(res.message || "Top-up successful", { type: "success" });
                    currentIdempotencyKey = uuidv4();
                    amountInput.value = "";
                    
                    // Dispatch event for any component listening to balance updates
                    window.dispatchEvent(new CustomEvent("wallet:balance-changed"));
                } else {
                    Notify(res?.message || "Transaction declined by gateway", { type: "error" });
                }
            } catch (err) {
                console.error("Network error:", err);
                Notify("Top-up request failed", { type: "error" });
            } finally {
                topupBtn.disabled = false;
            }
        }
    });

    async function loadBalance() {
        try {
            const res = await apiFetch("/wallet/balance");
            if (res && res.balance !== undefined) {
                balanceEl.textContent = `Wallet Balance: ${formatCurrency(res.balance)}`;
            } else {
                balanceEl.textContent = "Balance unavailable";
            }
        } catch (err) {
            console.error("Balance fetch error:", err);
            balanceEl.textContent = "Sync failed";
        }
    }

    // Auto-listen to global balance updates
    window.addEventListener("wallet:balance-changed", loadBalance);
    loadBalance();

    return {
        element: createElement("div", { id: "wallet-manager", class: "wallet-card" }, [
            createElement("h3", { class: "wallet-section-title" }, ["Account Balance"]),
            balanceEl,
            createElement("div", { class: "wallet-form" }, [amountInput, methodSelect, topupBtn])
        ]),
        loadBalance
    };
}