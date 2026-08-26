import { navigate } from "../../routes/navigate.js";
import { generateEventForm, EventFormInputData } from "./createOrEditEvent.js";
import Notify from "../../components/ui/Notify.js";
import { fetchEventById } from "./api.js";

/** Create a new event */
function createEvent(isLoggedIn: boolean, container: HTMLElement): void {
    // Simply generate a blank form
    generateEventForm(isLoggedIn, container);
}

/** Edit an existing event */
async function editEvent(
    isLoggedIn: boolean, 
    eventId: string | number, 
    container: HTMLElement
): Promise<void> {
    if (!isLoggedIn) {
        Notify("Please log in to edit an event.", { type: "warning", duration: 3000, dismissible: true });
        navigate("/login");
        return;
    }

    try {
        const eventData: EventFormInputData = await fetchEventById(eventId);
        generateEventForm(isLoggedIn, container, eventData);
    } catch (error: unknown) {
        console.error("Error fetching event data:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        Notify(`Error loading event: ${errorMessage}`, { type: "error", duration: 3000, dismissible: true });
    }
}

export { createEvent, editEvent };