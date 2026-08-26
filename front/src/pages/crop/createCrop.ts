
import { createCrop } from "../../services/crops/crop/createCrop.js";

export async function CreateCrop(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  const node = await createCrop("");
  if (node) contentContainer.appendChild(node);
}
