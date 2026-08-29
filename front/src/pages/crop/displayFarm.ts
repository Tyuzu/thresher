
import "../../../css/farmstyles/farmpage.css";
import { displayFarm } from "../../services/crops/farm/farmDisplay.js";

export interface FarmTarget {
  id: string;
  [key: string]: unknown;
}

export async function Farm(
  isLoggedIn: boolean,
  farm: FarmTarget,
  contentContainer: HTMLElement
): Promise<void> {
  displayFarm(isLoggedIn, farm.id, contentContainer);
}