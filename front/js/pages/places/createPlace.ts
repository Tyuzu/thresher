
import { createPlaceForm } from "../../services/place/createPlaceService.js";

export async function CreatePlace(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  const content = document.createElement("div");
  content.className = "create-section";
  contentContainer.appendChild(content);

  createPlaceForm(isLoggedIn, content);
}
