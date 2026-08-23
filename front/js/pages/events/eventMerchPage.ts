
import { renderMerchPage } from "../../services/tickets/merchOnlyPage.js";

export async function EventMerch(
  isLoggedIn: boolean,
  eventid: string,
  contentContainer: HTMLElement
): Promise<void> {
  renderMerchPage(isLoggedIn, eventid, contentContainer);
}
