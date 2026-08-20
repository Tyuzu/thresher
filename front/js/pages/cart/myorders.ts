import "../../../css/farmstyles/myorders.css";
import { displayMyOrders } from "../../services/cart/myOrdersPage.ts";

async function MyOrders(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayMyOrders(contentContainer, isLoggedIn);
}

export { MyOrders };
