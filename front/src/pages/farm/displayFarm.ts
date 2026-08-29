
import "../../../css/farmstyles/farmpage.css";
import { displayFarm } from "../../services/crops/farm/farmDisplay.js";

export async function Farm(
  isLoggedIn: boolean,
  farmid: string,
  contentContainer: HTMLElement
): Promise<void> {
  displayFarm(isLoggedIn, farmid, contentContainer);
}
