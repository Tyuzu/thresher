// eventMerchPage.ts
import { displayMerchandise } from "./merchUI.js";
import { createElement } from "../../components/createElement.js";
import { getState } from "../../state/state.js";
import { fetchEventById } from "../event/api.js";
import Notify from "../../components/ui/Notify.js";
import Datex from "../../components/base/Datex.js";
import { MerchItem } from "./merchUI.js";

interface EventData {
    success?: boolean;
    error?: string;
    merch?: MerchItem[];
    creatorid?: string | number;
    title?: string;
    description?: string;
    date?: string | number | Date;
    placename?: string;
    location?: string;
    category?: string;
    currency?: string;
    organizer_name?: string;
    organizer_contact?: string;
    [key: string]: unknown;
}

async function fetchEventData(eventId: string): Promise<EventData> {
    const eventData = (await fetchEventById(eventId)) as EventData;

    // Check if there was an API error
    if (eventData?.success === false) {
        throw new Error(`Failed to load event: ${eventData.error}`);
    }

    // Check if response is invalid
    if (!eventData) {
        throw new Error("No event data received from server.");
    }

    // Check if merch array exists and is an array
    if (!Array.isArray(eventData.merch)) {
        console.warn("Event data structure:", eventData);
        throw new Error("Invalid event data received - missing merch array.");
    }
    return eventData;
}

async function renderMerchPage(isLoggedIn: boolean, eventId: string, container: HTMLElement): Promise<void> {
    try {
        container.replaceChildren();
        const eventData = await fetchEventData(eventId);
        const currentUser = getState("user") as { userid?: string | number } | null;
        const isCreator = isLoggedIn && currentUser?.userid === eventData.creatorid;

        // === Event Header ===
        const header = createElement("div", { class: "event-header" }, [
            createElement("h1", {}, [eventData.title || "Untitled Event"]),
            createElement("p", {}, [eventData.description || "No description available."]),
            createElement("div", { class: "event-meta" }, [
                createElement("p", {}, [`📅 Date: ${Datex(eventData.date)}`]),
                createElement("p", {}, [`📍 Location: ${eventData.placename || eventData.location || "TBA"}`]),
                createElement("p", {}, [`🎟 Category: ${eventData.category || "Uncategorized"}`]),
                createElement("p", {}, [`💲 Currency: ${eventData.currency || "N/A"}`]),
            ]),
        ].filter(Boolean)) as HTMLElement;

        // === Organizer Info ===
        const organizer = (eventData.organizer_name || eventData.organizer_contact)
            ? createElement("div", { class: "event-organizer" }, [
                createElement("h3", {}, ["Organizer"]),
                createElement("p", {}, [`Name: ${eventData.organizer_name || "Unknown"}`]),
                createElement("p", {}, [`Contact: ${eventData.organizer_contact || "Not Provided"}`]),
            ]) as HTMLElement
            : null;

        // === Merch Section ===
        const merchcon = createElement("div", { class: "merchxcon" }, []) as HTMLElement;
        const editTabs = createElement("div", { id: "edittabs" }, []) as HTMLElement;

        container.appendChild(header);
        if (organizer) {
            container.appendChild(organizer);
        }
        container.appendChild(editTabs);
        container.appendChild(merchcon);

        await displayMerchandise(merchcon, "event", String(eventId), isCreator, isLoggedIn, eventData.merch);

    } catch (error: unknown) {
        container.replaceChildren();
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        container.appendChild(
            createElement("h1", {}, [`Error loading event details: ${errorMessage}`])
        );
        Notify("Failed to load event details. Please try again later.", { type: "error", duration: 3000 });
    }
}

export { renderMerchPage };