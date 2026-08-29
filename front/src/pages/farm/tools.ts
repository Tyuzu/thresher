
import "../../../css/farmstyles/protools.css";
import { displayItems } from "../../services/products/displayItems.js";

export async function Products(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayItems("product", contentContainer, isLoggedIn);
}

export async function Tools(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayItems("tool", contentContainer, isLoggedIn);
}