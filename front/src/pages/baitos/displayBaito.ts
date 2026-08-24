
import "../../../css/inistyles/baitopage3.css";
import { displayBaito } from "../../services/baitos/onebaito/baitoDisplay.js";

export async function Baito(
  isLoggedIn: boolean,
  baitoid: string,
  contentContainer: HTMLElement
): Promise<void> {
  displayBaito(isLoggedIn, baitoid, contentContainer);
}
