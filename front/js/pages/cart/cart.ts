import "../../../css/farmstyles/cart3.css";
import "../../../css/farmstyles/checkout.css";

import { displayCart } from "../../services/cart/cartPage.ts";

async function Cart(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayCart(contentContainer, isLoggedIn);
}

export { Cart };
