
import "../../../css/farmstyles/farms.css";
import { displayFarms } from "../../services/crops/farm/FarmsHome.js";

export async function Farms(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayFarms(contentContainer, isLoggedIn);
}
