// albumsAndEventsTab.ts

import { getAlbums, getMerch, getEvents, createEvent, addArtistToEvent } from "./api.js";
import { displayMerchandise } from "../merch/merchUI.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.js";
import Button from "../../components/base/Button.js";
import { navigate } from "../../routes/navigate.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Album {
    albumid?: string | number;
    title?: string;
    releaseDate?: string;
    description?: string;
    published?: boolean;
    [key: string]: any;
}

export interface ArtistEvent {
    eventid?: string | number;
    title?: string;
    date?: string;
    venue?: string;
    city?: string;
    country?: string;
    [key: string]: any;
}

interface EventFieldConfig {
    type: "text" | "date" | "url";
    name: string;
    placeholder?: string;
    required?: boolean;
}

export async function renderAlbumsTab(artistID: string | number, isCreator: boolean): Promise<HTMLElement> {
    const container = createElement("div", { class: "albums-container" }, []) as HTMLElement;

    const heading = createElement("p", {}, [
        createElement("strong", {}, ["🎶 Albums"])
    ]);
    container.append(heading);

    let albums: Album[] = [];
    try {
        albums = (await getAlbums(artistID)) as Album[];
    } catch {
        const msg = createElement("p", {}, ["Error loading albums."]);
        container.append(msg);
        return container;
    }

    if (!albums || !albums.length) {
        const msg = createElement("p", {}, ["No albums available."]);
        container.append(msg);
        return container;
    }

    const listWrapper = createElement("div", { class: "albums-wrapper" }, []) as HTMLElement;

    albums.forEach(a => {
        if (!a.published && !isCreator) {
            return;
        }

        const title = createElement("h3", {}, [a.title || ""]);
        const release = createElement("p", {}, [
            createElement("strong", {}, ["Release:"]),
            " ",
            a.releaseDate || ""
        ]);
        const desc = createElement("p", {}, [a.description || ""]);

        const block = createElement("div", { class: "album-block" }, [
            title,
            release,
            desc
        ]);

        listWrapper.append(block);
    });

    container.append(listWrapper);
    return container;
}

export async function renderMerchTab(container: HTMLElement, artistID: string | number, isCreator: boolean, isLoggedIn: boolean): Promise<void> {
    try {
        const merchItems = (await getMerch(artistID))?.data ?? [];

        const holder = createElement("div", { id: "edittabs" }, []) as HTMLElement;
        container.append(holder);

        // displayMerchandise signature: (container, entityType, eventId, isCreator, isLoggedIn, merchData)
        displayMerchandise(
            container,
            "artist",
            artistID,
            isCreator,
            isLoggedIn,
            merchItems
        );
    } catch {
        const msg = createElement("p", {}, ["Error loading merch."]);
        container.replaceChildren(msg);
    }
}

export async function renderEventsTab(container: HTMLElement, artistID: string | number, isCreator: boolean): Promise<void> {
    try {
        const events = (await getEvents(artistID)) as ArtistEvent[];
        container.replaceChildren();

        if (isCreator) {
            const createEventBtn = Button("Create New Event", "", {
                click: () => openEventModal(artistID, container)
            }, "action-btn buttonx") as HTMLElement;

            const addArtistToEventBtn = Button("Add Artist to an Event", "", {
                click: () => openAddToEventModal(artistID)
            }, "action-btn buttonx") as HTMLElement;

            container.append(createEventBtn, addArtistToEventBtn);
        }

        if (!events || events.length === 0) {
            container.append(createElement("p", {}, ["No upcoming events."]));
            return;
        }

        const ul = createElement("ul", {}, []) as HTMLElement;

        events.forEach(eventx => {
            const btn = eventx.eventid
                ? Button("View Event", "", { click: () => navigate(`/event/${eventx.eventid}`) })
                : createElement("span", {}, [""]);

            const li = createElement("li", {}, [
                createElement("strong", {}, [eventx.title || ""]),
                createElement("br"),
                `${eventx.date || ""} at ${eventx.venue || ""} — ${eventx.city || ""}, ${eventx.country || ""}`,
                createElement("br"),
                btn
            ]);

            ul.append(li);
        });

        container.append(ul);
    } catch {
        container.append(createElement("p", {}, ["Error loading events."]));
    }
}

// EVENT CREATION MODAL
function openEventModal(artistID: string | number, eventsContainer: HTMLElement): void {
    const form = createElement("form", { class: "event-form" }, []) as HTMLFormElement;

    const fields: EventFieldConfig[] = [
        { type: "text", name: "title", placeholder: "Event Title", required: true },
        { type: "date", name: "date", required: true },
        { type: "text", name: "venue", placeholder: "Venue", required: true },
        { type: "text", name: "city", placeholder: "City", required: true },
        { type: "text", name: "country", placeholder: "Country", required: true },
        { type: "url", name: "ticketUrl", placeholder: "Ticket URL (optional)" }
    ];

    fields.forEach(f => {
        const input = createElement("input", {
            type: f.type,
            name: f.name,
            placeholder: f.placeholder || "",
            required: f.required ? "true" : ""
        });
        form.append(input);
    });

    const submitBtn = createElement("button", { type: "submit" }, ["Create Event"]);
    form.append(submitBtn);

    const modalInstance = Modal({
        title: "Create New Event",
        content: form,
        onClose: () => {},
        autofocusSelector: "input[name='title']"
    });

    form.addEventListener("submit", async (e: Event) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));

            try {
            await createEvent(artistID, data);
            modalInstance?.close();

            if (eventsContainer) {
                await renderEventsTab(eventsContainer, artistID, true);
            }
        } catch (err) {
            console.error("Failed to create event", err);
        }
    });
}

// ADD ARTIST TO EVENT MODAL
function openAddToEventModal(artistID: string | number): void {
    const form = createElement("form", { class: "event-form" }, []) as HTMLFormElement;

    const input = createElement("input", {
        type: "text",
        name: "eventid",
        placeholder: "Event ID",
        required: "true"
    });

    const submitBtn = createElement("button", { type: "submit" }, ["Add"]);
    form.append(input, submitBtn);

    const modalInstance = Modal({
        title: "Add Artist To Event",
        content: form,
        onClose: () => {},
        autofocusSelector: "input[name='eventid']"
    });

    form.addEventListener("submit", async (e: Event) => {
        e.preventDefault();

        const data = Object.fromEntries(new FormData(form));
        try {
            await addArtistToEvent(artistID, data);
            modalInstance?.close();
        } catch (err) {
            console.error("Error adding artist to event", err);
        }
    });
}

