import { WalletManager } from "./WalletManager.js";
import { WalletTransactions } from "./walletTransactions.js";
import { WalletTransfer } from "./walletTransfer.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.js";
import { createWalletAccount, getWalletBalance } from "./api.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces */
/* ───────────────────────────────────────── */

export interface WalletBalanceResponse {
  exists?: boolean;
  accountExists?: boolean;
  balance?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface WalletCreateResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface ApiError extends Error {
  status?: number;
}

export interface WalletManagerInstance {
  element: HTMLElement;
  loadBalance: () => Promise<void> | void;
}

export function WalletDashboard(): HTMLElement {
  const container = createElement("div", { id: "wallet-dashboard", class: "wallet-dashboard" });

  // Loading indicator while checking account status
  const loadingEl = createElement("div", { class: "wallet-loading" }, ["Checking wallet account..."]);
  container.appendChild(loadingEl);

  async function checkAndRender(): Promise<void> {
    try {
      const res = await getWalletBalance();

      container.replaceChildren(); // Clear loading state

      // Check if account does NOT exist (e.g. res.exists === false or 404 response payload)
      if (!res || res.exists === false || res.accountExists === false) {
        renderCreateAccountView();
        return;
      }

      // Account exists: Render full wallet UI
      renderFullDashboard();
    } catch (err: unknown) {
      container.replaceChildren();

      const error = err as ApiError;
      // If backend returns a 404 error indicating no account exists
      if (error?.status === 404 || error?.message?.includes("not found")) {
        renderCreateAccountView();
      } else {
        container.appendChild(
          createElement("div", { class: "wallet-error" }, ["Unable to load wallet information."])
        );
      }
    }
  }

  function renderCreateAccountView(): void {
    const createBtn = Button({
      title: "Create Wallet Account",
      id: "btn-create-account",
      classes: "btn-primary",
      events: {
        click: async () => {
          createBtn.disabled = true;
          createBtn.textContent = "Creating Account...";

          try {
            const res = await createWalletAccount();
            if (res?.success) {
              Notify("Wallet account created successfully!", { type: "success" });
              await checkAndRender(); // Re-check and render the full dashboard
            } else {
              Notify(res?.message || "Failed to create wallet account", { type: "error" });
            }
          } catch (err: unknown) {
            console.error("Account creation error:", err);
            Notify("Error creating wallet account", { type: "error" });
          } finally {
            createBtn.disabled = false;
            createBtn.textContent = "Create Wallet Account";
          }
        }
      }
    }) as HTMLButtonElement;

    const createAccountCard = createElement("div", { class: "wallet-card empty-wallet-state" }, [
      createElement("h3", { class: "wallet-section-title" }, ["No Wallet Account Found"]),
      createElement("p", { class: "wallet-description" }, ["Set up your wallet account to start sending, receiving, and managing funds."]),
      createBtn
    ]);

    container.appendChild(createAccountCard);
  }

  function renderFullDashboard(): void {
    const leftCol = createElement("div", { class: "wallet-left-col" });

    const walletManagerInstance = WalletManager() as WalletManagerInstance;
    const walletManagerWrapper = createElement("section", { class: "wallet-section wallet-balance" }, [
      walletManagerInstance.element
    ]);

    const transferWrapper = createElement("section", { class: "wallet-section wallet-transfer" }, [
      WalletTransfer({ onBalanceChange: walletManagerInstance.loadBalance })
    ]);

    leftCol.append(walletManagerWrapper, transferWrapper);

    const rightCol = createElement("div", { class: "wallet-right-col" });
    const txnWrapper = createElement("section", { class: "wallet-section wallet-transactions" }, [
      WalletTransactions({ onBalanceChange: walletManagerInstance.loadBalance })
    ]);
    rightCol.append(txnWrapper);

    container.append(leftCol, rightCol);
  }

  checkAndRender();

  return container;
}