
import { renderTicksPage } from "../../services/tickets/ticketsOnlyPage.js";

export async function EventTickets(
  isLoggedIn: boolean,
  eventid: string,
  contentContainer: HTMLElement
): Promise<void> {
  renderTicksPage(isLoggedIn, eventid, contentContainer);
}