
import "../../../css/inistyles/events6.css";
import { displayEvents } from "../../services/event/displayEvents.js";

export async function Events(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayEvents(isLoggedIn, contentContainer);
}
