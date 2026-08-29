

import "../../../css/inistyles/eventpage.css";
import { viewEventAnalytics } from "../../services/event/eventAnalytics.js";

export async function EventAnalytics(
  isLoggedIn: boolean,
  eventid: string,
  contentContainer: HTMLElement
): Promise<void> {
  viewEventAnalytics(contentContainer, isLoggedIn, eventid);
}
