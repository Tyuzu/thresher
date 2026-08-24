
import { displayShopping } from "../../services/shopping/shopping.js";

export async function Shop(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayShopping(contentContainer, isLoggedIn);
}
