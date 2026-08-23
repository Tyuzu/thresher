
import "../../../css/subpages/tickscon.css";
import { displayEvent } from "../../services/event/eventService.js";

export async function Event(
  isLoggedIn: boolean,
  eventid: string,
  contentContainer: HTMLElement
): Promise<void> {
  displayEvent(isLoggedIn, eventid, contentContainer);
}
