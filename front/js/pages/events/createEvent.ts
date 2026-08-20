import { createEvent } from "../../services/event/creadit.ts";

async function CreateEvent(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createEvent(isLoggedIn, contentContainer);
}

export { CreateEvent };
