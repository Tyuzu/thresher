
import { displayBazarBhav } from "../../services/crops/bazarbhav/bazaarBhav.js";

export async function BazaarBhav(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayBazarBhav(contentContainer);
}
