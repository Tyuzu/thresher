// --- Imports ---
import { getState } from "../../state/state.ts";
import { apiFetch } from "../../api/api.ts";
import { navigate } from "../../routes/navigate.ts";
import { createElement } from "../../components/createElement.ts";
import Notify from "../../components/ui/Notify.ts";

import { displayEventDetails } from "./displayEventDetails.ts";
import { displayEventVenue, displayEventFAQ, displayEventReviews, displayLostAndFound, displayContactDetails } from "./eventTabs.ts";
import { editEvent } from "./creadit.ts";
import { displayTickets } from "../tickets/displayTickets.ts";
import { displayMerchandise } from "../merch/merchService.ts";
import { displayMedia } from "../media/ui/mediaGallery.ts";
// import { persistTabs } from "../../utils/persistTabs.ts";
import { createTabs } from "../../utils/persistTabs.ts";
import { showSeatingBanner } from "../tickets/seatingBanner.ts";
import { displayEventNews } from "./eventMoreTabs.ts";


async function displayEventMerch(container, eventID, isCreator, isLoggedIn) {
  try {
    const response = await apiFetch(`/merch/event/${eventID}`);
    const merchItems = response?.data ?? [];

    const holder = createElement("div", { id: "edittabs" }, []);
    container.append(holder);

    displayMerchandise(
      container,
      merchItems,
      "event",
      eventID,
      isCreator,
      isLoggedIn
    );
  } catch (err) {
    console.error("Error loading merch:", err);
    const msg = createElement("p", {}, ["Error loading merch."]);
    container.replaceChildren(msg);
  }
}

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

    return eventData;
}

// Setup Event Tabs
const setupTabs = (eventData, eventId, isCreator, isLoggedIn) => {
    const tabs = [];
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

async function displayEvent(isLoggedIn, eventId, content) {
    const container = createElement('div', { class: "eventpage" }, []);
    content.appendChild(container);

    try {
        const eventData = await fetchEventData(eventId);
        const isCreator = getState("user").userid === eventData.creatorid && isLoggedIn;

        await displayEventDetails(container, eventData, isCreator, isLoggedIn);

        if (eventData?.seating) {
            container.appendChild(showSeatingBanner(eventData, isCreator));
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

    } catch (error) {
        container.replaceChildren();
        container.appendChild(
            createElement("h1", {}, [`Error loading event details: ${error.message}`])
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