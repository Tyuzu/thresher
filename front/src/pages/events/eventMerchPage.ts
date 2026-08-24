
import { renderMerchPage } from "../../services/merch/merchOnlyPage.js";

export async function EventMerch(
  isLoggedIn: boolean,
  eventid: string,
  contentContainer: HTMLElement
): Promise<void> {
  renderMerchPage(isLoggedIn, eventid, contentContainer);
}
