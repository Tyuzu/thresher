import { WalletDashboard } from "./walletDashboard.js";

/**
 * Renders the wallet dashboard component into the provided DOM container.
 * 
 * @param isLoggedIn - Authentication status flag
 * @param contentContainer - The target DOM element where the dashboard will be mounted
 */
export function displayWallet(isLoggedIn: boolean, contentContainer: HTMLElement): void {
  contentContainer.replaceChildren();
  contentContainer.appendChild(WalletDashboard());
}