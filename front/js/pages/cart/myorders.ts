
import "../../../css/farmstyles/myorders.css";
import { displayMyOrders } from "../../services/cart/myOrdersPage.js";

export async function MyOrders(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayMyOrders(contentContainer, isLoggedIn);
}