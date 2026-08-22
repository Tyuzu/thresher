import "../../../css/inistyles/eventpage4.css";
import "../../../css/subpages/tickscon.css";
import { renderTicksPage } from "../../services/tickets/ticketsOnlyPage.js";

async function EventTickets(isLoggedIn, eventid, contentContainer) {
    renderTicksPage(isLoggedIn, eventid, contentContainer)
}


export { EventTickets };
