import "../../../css/inistyles/baitodash.css";
import { displayBaitoDash } from "../../services/baitos/dash/BaitoDash.js";

export async function BaitoDash(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  displayBaitoDash(isLoggedIn, contentContainer);
}
