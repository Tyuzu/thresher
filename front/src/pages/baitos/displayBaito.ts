
import "../../../css/inistyles/baitopage.css";
import { displayBaito } from "../../services/baitos/onebaito/baitoDisplay.js";

export async function Baito(
  isLoggedIn: boolean,
  baitoid: string,
  contentContainer: HTMLElement
): Promise<void> {
  displayBaito(isLoggedIn, baitoid, contentContainer);
}
