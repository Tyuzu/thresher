import { renderTicksPage } from "../../services/tickets/ticketsOnlyPage.js";

async function EventTickets(isLoggedIn, t, eventid, contentContainer) {
    renderTicksPage(isLoggedIn, eventid, contentContainer)
}


export { EventTickets };
