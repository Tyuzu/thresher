import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { formatCurrency } from "../../types/api.types.ts";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";

export function WalletTransactions({ onBalanceChange }) {
    const container = createElement("div", { id: "wallet-transactions", class: "wallet-card" }, [
        createElement("h3", { class: "wallet-section-title" }, ["Transaction Ledger History"])
    ]);

    let skip = 0;
    const limit = 10;
    let refundIdempotencyKeys = {}; // Tracks specific mapping targets independently 

    function renderStatusBadge(state = "") {
        const classes = {
            initiated: "badge-pending", pending: "badge-pending",
            success: "badge-success", failed: "badge-failed", reversed: "badge-reversed"
        };
        return createElement("span", {
            class: `txn-badge ${classes[String(state).toLowerCase()] || ""}`
        }, [String(state).toUpperCase()]);
    }

    async function loadTransactions() {
        container.querySelectorAll(".load-more, .txn-error").forEach((el) => el.remove());

        try {
            const res = await apiFetch(`/wallet/transactions?skip=${skip}&limit=${limit}`);
            const transactions = Array.isArray(res) ? res : res?.transactions;

            if (!Array.isArray(transactions)) {
                container.appendChild(createElement("div", { class: "txn-error" }, ["Could not load ledger profile info"]));
                return;
            }

            transactions.forEach((txn) => {
                // Initialize specific tracking reference key if parsing unique context configurations
                if (!refundIdempotencyKeys[txn.id]) {
                    refundIdempotencyKeys[txn.id] = uuidv4();
                }

                const typeLabel = txn.type === "topup" ? "Top-up" : txn.type === "payment" ? "Payment" : String(txn.type || "").toUpperCase();
                const typeClass = `txn-${txn.type || 'default'}`;

                const txnEl = createElement("div", { class: `txn-item ${typeClass}` }, [
                    createElement("div", { class: "txn-info" }, [
                        `${typeLabel} ${formatCurrency(txn.amount)} via ${txn.method || 'System standard channel'}`
                    ])
                ]);

                const metaEl = createElement("div", { class: "txn-meta" }, []);
                metaEl.appendChild(renderStatusBadge(txn.status));

                const dateEl = Datex(txn.created_at);
                if (dateEl instanceof Node) {
                    dateEl.classList.add("txn-date");
                    metaEl.appendChild(dateEl);
                } else {
                    metaEl.appendChild(createElement("span", { class: "txn-date" }, [String(dateEl)]));
                }

                txnEl.appendChild(metaEl);

                if (txn.type === "payment" && txn.status === "success" && txn.from_account === txn.userid) {
                    const refundBtn = Button("Process Refund", "btn-refund", {
                        click: async () => {
                            if (!confirm("Confirm transaction reversion protocol?")) return;

                            refundBtn.disabled = true;
                            try {
                                const refundRes = await apiFetch("/wallet/refund", "POST", 
                                    { transaction_id: txn.id },
                                    { headers: { "Idempotency-Key": refundIdempotencyKeys[txn.id] } }
                                );

                                if (refundRes?.success) {
                                    Notify("Reversion payload complete.", { type: "success" });
                                    delete refundIdempotencyKeys[txn.id]; // Purge old signature map key
                                    if (onBalanceChange) onBalanceChange();
                                    skip = 0;
                                    await loadTransactions();
                                } else {
                                    Notify(refundRes?.message || "Reversion denied by interface rules", { type: "error" });
                                }
                            } catch (err) {
                                console.error("Refund configuration collision:", err);
                                Notify("Server encountered error executing transactional return sequence", { type: "error" });
                            } finally {
                                refundBtn.disabled = false;
                            }
                        }
                    });
                    metaEl.appendChild(refundBtn);
                }

                container.appendChild(txnEl);
            });

            if (transactions.length === limit) {
                const moreBtn = Button("Load More History", "load-more", {
                    click: async () => {
                        moreBtn.disabled = true;
                        try {
                            skip += limit;
                            await loadTransactions();
                        } finally {
                            moreBtn.disabled = false;
                        }
                    }
                });
                container.appendChild(moreBtn);
            }
        } catch (err) {
            console.error(err);
            container.appendChild(createElement("div", { class: "txn-error" }, ["Ledger mapping broken by server fault."]));
        }
    }

    loadTransactions();
    return container;
}