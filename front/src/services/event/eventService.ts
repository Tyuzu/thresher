// --- Imports ---
import { getState } from "../../state/state.js";
import { navigate } from "../../routes/navigate.js";
import { createElement } from "../../components/createElement.js";
import { fetchEventById, fetchEventMerch } from "./api.js";
import Notify from "../../components/ui/Notify.js";

import { displayEventDetails } from "./displayEventDetails.js";
import { displayEventVenue, displayEventFAQ, displayEventReviews, displayLostAndFound, displayContactDetails } from "./eventTabs.js";
import { editEvent } from "./creadit.js";
import { displayTickets } from "../tickets/displayTickets.js";
import { displayMerchandise } from "../merch/merchUI.js";
import { displayMedia } from "../media/ui/mediaGallery.js";
import { createTabs } from "../../utils/persistTabs.js";
import { showSeatingBanner } from "../tickets/seatingBanner.js";
import { displayEventNews } from "./eventMoreTabs.js";

// --- Type Definitions / Interfaces ---

export interface EventData {
    id?: string | number;
    eventid?: string | number;
    creatorid?: string | number;
    date: string | Date;
    seating?: unknown;
    contactInfo?: unknown;
    success?: boolean;
    error?: string;
    [key: string]: unknown;
}

export interface TabItem {
    title: string;
    id: string;
    render: (container: HTMLElement) => void | Promise<void>;
}

// --- Helper Functions ---

async function displayEventMerch(
    container: HTMLElement, 
    eventID: string | number, 
    isCreator: boolean, 
    isLoggedIn: boolean
): Promise<void> {
    try {
        const response = await fetchEventMerch(eventID);
        const merchItems = response?.data ?? [];

        const holder = createElement("div", { id: "edittabs" }, []);
        container.append(holder);

        displayMerchandise(
            container,
            "event",
            eventID,
            isCreator,
            isLoggedIn,
            merchItems
        );
    } catch (err) {
        console.error("Error loading merch:", err);
        const msg = createElement("p", {}, ["Error loading merch."]);
        container.replaceChildren(msg);
    }
}

const confirmAndExecute = async (
    message: string, 
    action: () => Promise<void>, 
    successMessage: string, 
    errorMessage: string
): Promise<void> => {
    if (confirm(message)) {
        try {
            await action();
            Notify(successMessage, { type: "success", duration: 3000, dismissible: true });
        } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            Notify(`${errorMessage}: ${errMessage}`, { type: "error", duration: 3000, dismissible: true });
        }
    }
};

const getEventStatus = (eventDate: string | Date): "ongoing" | "active" => 
    new Date(eventDate) <= new Date() ? "ongoing" : "active";

const createVenue = async (
    container: HTMLElement, 
    eventId: string | number, 
    seating: any, 
    isLoggedIn: boolean
): Promise<void> => {
    const venueContainer = createElement('div', { id: 'event-venue', class: 'venue-container' }) as HTMLElement;
    await displayEventVenue(venueContainer, isLoggedIn, eventId, seating);
    container.appendChild(venueContainer);
};

// --- Core Functions ---

// Fetch Event Data
async function fetchEventData(eventId: string | number): Promise<EventData> {
    const eventData = await fetchEventById(eventId);

    // Check if there was an API error
    if (eventData?.success === false) {
        throw new Error(`Failed to load event: ${eventData.error}`);
    }

    // Check if response is invalid
    if (!eventData) {
        throw new Error("No event data received from server.");
    }

    // Ensure eventid is available for downstream callers
    if (!eventData.eventid && eventData.id) {
        try {
            // coerce to string/number as originally expected
            (eventData as any).eventid = eventData.id;
        } catch (e) {
            // ignore
        }
    }

    return eventData;
}

// Setup Event Tabs
const setupTabs = (
    eventData: EventData, 
    eventId: string | number, 
    isCreator: boolean, 
    isLoggedIn: boolean
): TabItem[] => {
    const tabs: TabItem[] = [];
    const status = getEventStatus(eventData.date);

    if (status === "active") {
        tabs.push(
            { title: "Tickets", id: "tickets-tab", render: (c) => displayTickets(c, eventId, isCreator, isLoggedIn) },
            { title: "FAQ", id: "faq-tab", render: (c) => displayEventFAQ(c, isCreator, eventId) },
            { title: "Merchandise", id: "merch-tab", render: (c) => displayEventMerch(c, eventId, isCreator, isLoggedIn) },
            { title: "News", id: "news-tab", render: (c) => displayEventNews(c, eventId, isLoggedIn) },
        );
    } else {
        tabs.push(
            { title: "Reviews", id: "reviews-tab", render: (c) => displayEventReviews(c, eventId, isCreator, isLoggedIn) },
            { title: "Media", id: "media-tab", render: (c) => displayMedia(c, "event", eventId, isLoggedIn) },
            { title: "Lost & Found", id: "lnf-tab", render: (c) => displayLostAndFound(c, isCreator, eventId) },
            { title: "Contact", id: "contact-tab", render: (c) => displayContactDetails(c, isCreator, eventData.contactInfo) }
        );
    }

    return tabs;
};

async function displayEvent(
    isLoggedIn: boolean, 
    eventId: string | number, 
    content: HTMLElement
): Promise<void> {
    const container = createElement('div', { class: "eventpage" }, []) as HTMLElement;
    content.appendChild(container);

    try {
        const eventData = await fetchEventData(eventId);
        const userState = getState("user");
        const isCreator = userState?.userid === eventData.creatorid && isLoggedIn;

        await displayEventDetails(container, eventData as any, isCreator, isLoggedIn);

        if (eventData?.seating) {
            container.appendChild(showSeatingBanner(eventData as any, isCreator));
        }

        const tabs = setupTabs(eventData, eventId, isCreator, isLoggedIn);

        // Replace persistTabs with createTabs
        const tabUI = createTabs(
            tabs,
            `event-tabs:${eventId}`, // routeKey for saving tab state
            null,                    // initialTabId (optional)
            (_newTabId) => { /* optional callback */ }
        );
        container.appendChild(tabUI);

        if (eventData?.seating) {
            await createVenue(container, eventId, eventData.seating, isLoggedIn);
        }

    } catch (error: unknown) {
        container.replaceChildren();
        const errorMessage = error instanceof Error ? error.message : String(error);
        container.appendChild(
            createElement("h1", {}, [`Error loading event details: ${errorMessage}`])
        );
        Notify("Failed to load event details. Please try again later.", { type: "error", duration: 3000, dismissible: true });
    }
}

// --- Exports ---
export {
    editEvent,
    fetchEventData,
    displayEvent,
};