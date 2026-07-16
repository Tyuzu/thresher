import { displayEvent } from "../../services/event/eventService.js";

async function Event(isLoggedIn, t, eventid, contentContainer) {
    displayEvent(isLoggedIn, eventid, contentContainer);
}


export { Event };
