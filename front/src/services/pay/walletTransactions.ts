import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { formatCurrency, Paise } from "../../types/api.types.js";
import { v4 as uuidv4 } from "uuid";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.js";
import { getWalletTransactions, refundWalletTransaction } from "./api.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces */
/* ───────────────────────────────────────── */

export type TransactionType = "topup" | "payment" | string;

export type TransactionStatus = "initiated" | "pending" | "success" | "failed" | "reversed" | string;

export interface TransactionItem {
  id: string | number;
  type?: TransactionType;
  amount: Paise | number;
  method?: string;
  status?: TransactionStatus;
  created_at: string | number | Date;
  from_account?: string | number;
  userid?: string | number;
  [key: string]: unknown;
}

export interface TransactionResponse {
  transactions?: TransactionItem[];
  [key: string]: unknown;
}

export interface RefundResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface WalletTransactionsProps {
  onBalanceChange?: () => void;
}

/* ───────────────────────────────────────── */
/* Wallet Transactions Component */
/* ───────────────────────────────────────── */

export function WalletTransactions({ onBalanceChange }: WalletTransactionsProps): HTMLElement {
  const container = createElement("div", { id: "wallet-transactions", class: "wallet-card" }, [
    createElement("h3", { class: "wallet-section-title" }, ["Transaction Ledger History"])
  ]);

  let skip = 0;
  const limit = 10;
  const refundIdempotencyKeys: Record<string | number, string> = {}; // Tracks specific mapping targets independently 

  function renderStatusBadge(state: TransactionStatus = ""): HTMLElement {
    const classes: Record<string, string> = {
      initiated: "badge-pending",
      pending: "badge-pending",
      success: "badge-success",
      failed: "badge-failed",
      reversed: "badge-reversed"
    };

    return createElement("span", {
      class: `txn-badge ${classes[String(state).toLowerCase()] || ""}`
    }, [String(state).toUpperCase()]);
  }

  async function loadTransactions(): Promise<void> {
    container.querySelectorAll(".load-more, .txn-error").forEach((el) => el.remove());

    try {
      const res = await getWalletTransactions(skip, limit);

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

        const dateEl = Datex(txn.created_at as string);
        if (dateEl && typeof dateEl === "object" && 'nodeType' in (dateEl as any)) {
          (dateEl as HTMLElement).classList.add("txn-date");
          metaEl.appendChild(dateEl as unknown as Node);
        } else {
          metaEl.appendChild(createElement("span", { class: "txn-date" }, [String(dateEl)]));
        }

        txnEl.appendChild(metaEl);

        if (txn.type === "payment" && txn.status === "success" && txn.from_account === txn.userid) {
          const refundBtn = Button({
            title: "Process Refund",
            classes: "btn-refund",
            events: {
              click: async () => {
                if (!confirm("Confirm transaction reversion protocol?")) return;

                refundBtn.disabled = true;
                try {
                  const refundRes = await refundWalletTransaction(txn.id, refundIdempotencyKeys[txn.id]);

                  if (refundRes?.success) {
                    Notify("Reversion payload complete.", { type: "success" });
                    delete refundIdempotencyKeys[txn.id]; // Purge old signature map key
                    if (onBalanceChange) onBalanceChange();
                    skip = 0;
                    await loadTransactions();
                  } else {
                    Notify(refundRes?.message || "Reversion denied by interface rules", { type: "error" });
                  }
                } catch (err: unknown) {
                  console.error("Refund configuration collision:", err);
                  Notify("Server encountered error executing transactional return sequence", { type: "error" });
                } finally {
                  refundBtn.disabled = false;
                }
              }
            }
          }) as HTMLButtonElement;

          metaEl.appendChild(refundBtn);
        }

        container.appendChild(txnEl);
      });

      if (transactions.length === limit) {
        const moreBtn = Button({
          title: "Load More History",
          classes: "load-more",
          events: {
            click: async () => {
              moreBtn.disabled = true;
              try {
                skip += limit;
                await loadTransactions();
              } finally {
                moreBtn.disabled = false;
              }
            }
          }
        }) as HTMLButtonElement;

        container.appendChild(moreBtn);
      }
    } catch (err: unknown) {
      console.error(err);
      container.appendChild(createElement("div", { class: "txn-error" }, ["Ledger mapping broken by server fault."]));
    }
  }

  loadTransactions();
  return container;
}