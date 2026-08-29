
import "../../../css/inistyles/wallet.css";
import { displayWallet } from "../../services/pay/walletService.js";

export async function Wallet(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayWallet(isLoggedIn, contentContainer);
}
