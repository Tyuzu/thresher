
import "../../../css/farmstyles/croppage.css";
import "../../../css/farmstyles/croppageform.css";
import { displayCrop } from "../../services/crops/crop/cropPage.js";

export async function Crop(
  isLoggedIn: boolean,
  cropID: string,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayCrop(contentContainer, cropID, isLoggedIn);
}
