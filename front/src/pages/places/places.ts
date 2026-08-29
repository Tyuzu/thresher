import "../../../css/inistyles/places.css";
import { displayPlaces } from "../../services/place/displayPlaces.js";

export async function Places(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayPlaces(isLoggedIn, contentContainer);
}