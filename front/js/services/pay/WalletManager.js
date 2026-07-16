import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import { formatCurrency } from "../../types/api.types.ts";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";
import Notify from "../../components/ui/Notify.mjs";

function parseAmountToPaise(value) {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount <= 0) return 0;
    // Fixes floating point errors during calculation transitions
    return Math.round((amount + Number.EPSILON) * 100);
}

export function WalletManager() {
    // CRITICAL FIX: Persist token reference outside execution parameters so retries use identical tracking hashes
    let currentIdempotencyKey = uuidv4();

    const balanceEl = createElement("div", { id: "wallet-balance", class: "balance-display" });
    const amountInput = createElement("input", {
        type: "number",
        id: "topup-amount",
        placeholder: "Enter value in INR",
        min: "1",
        step: "0.01"
    });

    const methodSelect = createElement("select", { id: "topup-method" }, [
        createElement("option", { value: "wallet" }, ["Wallet Balance"]),
        createElement("option", { value: "card" }, ["Credit/Debit Card"]),
        createElement("option", { value: "upi" }, ["UPI Ecosystem"])
    ]);

    const topupBtn = Button("Top Up Account", "topup-btn", {
        click: async () => {
            const amountPaise = parseAmountToPaise(amountInput.value);
            const method = methodSelect.value;

            if (amountPaise <= 0) {
                return Notify("Please insert a valid currency configuration value", { type: "warning" });
            }

            topupBtn.disabled = true;
            try {
                const res = await apiFetch("/wallet/topup", "POST", 
                    { amount: amountPaise, method }, 
                    { headers: { "Idempotency-Key": currentIdempotencyKey } }
                );

                if (res?.success) {
                    Notify(res.message || "Top-up initialized successfully", { type: "success" });
                    
                    // Reset key signature ONLY when confirmed complete by data nodes
                    currentIdempotencyKey = uuidv4();
                    amountInput.value = "";
                    await loadBalance();
                } else {
                    Notify(res?.message || "Execution blocked by financial gateway", { type: "error" });
                }
            } catch (err) {
                console.error("Network system collision:", err);
                Notify("Top-up request execution interrupted by processing failure", { type: "error" });
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
                balanceEl.textContent = "Balance status calculation unreadable";
            }
        } catch (err) {
            console.error("Balance calculation error:", err);
            balanceEl.textContent = "Balance synchronization unavailable";
        }
    }

    loadBalance();

    return {
        element: createElement("div", { id: "wallet-manager", class: "wallet-card" }, [
            createElement("h3", { class: "wallet-section-title" }, ["Account Balance Balance"]),
            balanceEl,
            createElement("div", { class: "wallet-form" }, [amountInput, methodSelect, topupBtn])
        ]),
        loadBalance
    };
}