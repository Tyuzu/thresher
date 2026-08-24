
import "../../../css/farmstyles/crops8.css";
import { displayCrops } from "../../services/crops/crop/crops.js";

export async function Crops(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayCrops(contentContainer);
}
