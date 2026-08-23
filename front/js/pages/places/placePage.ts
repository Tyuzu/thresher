
import "../../../css/inistyles/placepage1.css";
import "../../../css/subpages/nearby1.css";
import { displayPlace } from "../../services/place/placeService.js";

export async function Place(
  isLoggedIn: boolean,
  placeid: string,
  contentContainer: HTMLElement
): Promise<void> {
  const content = document.createElement("div");
  content.className = "placepage";
  contentContainer.appendChild(content);
  displayPlace(isLoggedIn, placeid, content);
}
