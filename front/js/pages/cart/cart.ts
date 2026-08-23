import "../../../css/farmstyles/cart3.css";
import "../../../css/farmstyles/checkout.css";

import { displayCart } from "../../services/cart/cartPage.js";

export async function Cart(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayCart(contentContainer, isLoggedIn);
}
