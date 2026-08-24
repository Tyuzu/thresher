
import "../../../css/inistyles/baitos6.css";
import { displayBaitos } from "../../services/baitos/DisplayBaitos.js";

export async function Baitos(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayBaitos(contentContainer, isLoggedIn);
}
