
import "../../../css/inistyles/placepage.css";
import "../../../css/subpages/nearby.css";
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
