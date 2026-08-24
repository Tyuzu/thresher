
import { createBaito } from "../../services/baitos/create/createBaito.js";

export async function CreateBaito(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  createBaito(isLoggedIn, contentContainer);
}
