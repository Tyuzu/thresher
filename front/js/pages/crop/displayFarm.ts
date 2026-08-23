
import "../../../css/farmstyles/farmpage3.css";
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