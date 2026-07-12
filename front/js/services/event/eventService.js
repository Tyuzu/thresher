// --- Imports ---
import { getState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

import { displayEventDetails } from "./displayEventDetails.js";
import { displayEventVenue, displayEventFAQ, displayEventReviews, displayLostAndFound, displayContactDetails } from "./eventTabs.js";
import { editEvent } from "./creadit.js";
import { displayTickets } from "../tickets/displayTickets.js";
import { displayMerchandise } from "../merch/merchService.js";
import { displayMedia } from "../media/ui/mediaGallery.js";
// import { persistTabs } from "../../utils/persistTabs.js";
import { createTabs } from "../../components/ui/createTabs.js";
import { showSeatingBanner } from "../tickets/seatingBanner.js";
import { displayEventNews } from "./eventMoreTabs.js";


// --- Helpers ---

const confirmAndExecute = async (message, action, successMessage, errorMessage) => {
    if (confirm(message)) {
        try {
            await action();
            Notify(successMessage, { type: "success", duration: 3000, dismissible: true });
        } catch (error) {
            Notify(`${errorMessage}: ${error.message}`, { type: "error", duration: 3000, dismissible: true });
        }
    }
};

const getEventStatus = (eventDate) => new Date(eventDate) <= new Date() ? "ongoing" : "active";

const createVenue = async (container, eventId, seating, isLoggedIn) => {
    const venueContainer = createElement('div', { id: 'event-venue', class: 'venue-container' });
    await displayEventVenue(venueContainer, isLoggedIn, eventId, seating);
    container.appendChild(venueContainer);
};

// --- Core Functions ---

// Delete Event
async function deleteEvent(isLoggedIn, eventId) {
    if (!isLoggedIn) {
        Notify("Please log in to delete your event.", { type: "warning", duration: 3000, dismissible: true });
        return
    }
    await confirmAndExecute(
        "Are you sure you want to delete this event?",
        () => apiFetch(`/events/event/${eventId}`, "DELETE").then(() => navigate("/events")),
        "Event deleted successfully.",
        "Error deleting event"
    );
}


// Fetch Event Data
async function fetchEventData(eventId) {
    const eventData = await apiFetch(`/events/event/${eventId}`);
    
    // Check if there was an API error
    if (eventData?.success === false) {
        throw new Error(`Failed to load event: ${eventData.error}`);
    }
    
    // Check if response is invalid
    if (!eventData) {
        throw new Error("No event data received from server.");
    }
    
    // Check if tickets array exists and is an array
    if (!Array.isArray(eventData.tickets)) {
        console.warn("Event data structure:", eventData);
        throw new Error("Invalid event data received - missing tickets array.");
    }
    
    return eventData;
}

// Setup Event Tabs
const setupTabs = (eventData, eventId, _isCreator, isLoggedIn) => {
    const tabs = [];
    const status = getEventStatus(eventData.date);

    if (status === "active") {
        tabs.push(
            { title: "Tickets", id: "tickets-tab", render: (c) => displayTickets(c, eventData.tickets, eventId, _isCreator, isLoggedIn) },
            { title: "FAQ", id: "faq-tab", render: (c) => displayEventFAQ(c, _isCreator, eventId, eventData.faqs) },
            { title: "Merchandise", id: "merch-tab", render: (c) => displayMerchandise(c, eventData.merch, "event", eventId, _isCreator, isLoggedIn) },
            { title: "News", id: "news-tab", render: (c) => displayEventNews(c, eventId, isLoggedIn) },
        );
    } else {
        tabs.push(
            { title: "Reviews", id: "reviews-tab", render: (c) => displayEventReviews(c, eventId, _isCreator, isLoggedIn) },
            { title: "Media", id: "media-tab", render: (c) => displayMedia(c, "event", eventId, isLoggedIn) },
            { title: "Lost & Found", id: "lnf-tab", render: (c) => displayLostAndFound(c, _isCreator, eventId) },
            { title: "Contact", id: "contact-tab", render: (c) => displayContactDetails(c, eventData.contactInfo) }
        );
    }

    return tabs;
};

async function displayEvent(isLoggedIn, eventId, content) {
    content.replaceChildren();
    const container = createElement('div', { class: "eventpage" }, []);
    content.appendChild(container);

    try {
        const eventData = await fetchEventData(eventId);
        const isCreator = getState("user") === eventData.creatorid && isLoggedIn;
        
        await displayEventDetails(container, eventData, isCreator, isLoggedIn);

        if (eventData?.seating) {
            container.appendChild(showSeatingBanner(eventData, isCreator));
        }

        const tabs = setupTabs(eventData, eventId, isCreator, isLoggedIn);

        // Replace persistTabs with createTabs
        const tabUI = createTabs(
            tabs,
            `event-tabs:${eventId}`, // routeKey for saving tab state
            null,                     // initialTabId (optional)
            (_newTabId) => { /* optional callback */ }
        );
        container.appendChild(tabUI);

        if (eventData?.seating) {
            await createVenue(container, eventData.eventid, eventData.seating, isLoggedIn);
        }

    } catch (error) {
        container.replaceChildren();
        container.appendChild(
            createElement("h1", { textContent: `Error loading event details: ${error.message}` })
        );
        Notify("Failed to load event details. Please try again later.", { type: "error", duration: 3000, dismissible: true });
    }
}


// --- Exports ---
export {
    editEvent,
    fetchEventData,
    displayEvent,
    deleteEvent,
};

