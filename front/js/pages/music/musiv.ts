
import "../../../css/inistyles/musicon.css";
import { displayMusic } from "../../services/musicon/wuzic.js";

export async function Music(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayMusic(contentContainer, isLoggedIn);
}