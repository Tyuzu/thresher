import "../../../css/inistyles/wallet1.css";
import { displayWallet } from "../../services/pay/walletService.ts";

async function Wallet(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayWallet(isLoggedIn, contentContainer);
}

export { Wallet };
