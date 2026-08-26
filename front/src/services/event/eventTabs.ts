import { Button } from "../../components/base/Button.js";
import { Imagex } from "../../components/base/Imagex.js";
import { API_URL } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { displayReviews } from "../reviews/displayReviews.js";
import { displayEventFAQs } from "./eventFAQHelper.js";
import { createLostAndFoundItem, fetchFaqsForEvent, fetchLostAndFoundForEvent } from "./api.js";
// import { displaySeatingMap } from "./seatingMap.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";

// --- Type Definitions / Interfaces ---

export interface FAQItem {
    id: string | number;
    question: string;
    answer: string;
}

export interface LostAndFoundItem {
    id: string | number;
    type: "lost" | "found";
    name: string;
    description: string;
    reportedBy: string;
}

export interface LivestreamAngle {
    name: string;
    url: string;
}

export interface LivestreamResponse {
    angles: LivestreamAngle[];
}

async function displayEventReviews(
    reviewsContainer: HTMLElement,
    eventId: string | number,
    isCreator: boolean,
    isLoggedIn: boolean
): Promise<void> {
    displayReviews(reviewsContainer, isCreator, isLoggedIn, "event", eventId);
}

async function displayEventVenue(
    venueList: HTMLElement,
    isLoggedIn: boolean,
    eventID: string | number,
    seatingplan: string
): Promise<void> {
    // displaySeatingMap(venueList, place, eventid, isLoggedIn);
    // loadMap(venueList, isLoggedIn, { type: "event", id: eventID });
    const imgx = resolveImagePath(EntityType.EVENT, PictureType.SEATING, seatingplan);
    venueList.appendChild(Imagex({ src: imgx }));
}

async function displayEventFAQ(
    faqContainer: HTMLElement,
    isCreator: boolean,
    eventId: string | number
): Promise<void> {
    let faqs: FAQItem[] = [];
    try {
        const response = await fetchFaqsForEvent(eventId);
        faqs = response?.data ?? [];
    } catch (err) {
        console.error("Failed to load FAQs:", err);
        const msg = createElement("p", {}, ["Error loading faqs."]);
        faqContainer.replaceChildren(msg);
        return;
    }
    displayEventFAQs(isCreator, faqContainer, eventId, faqs as any);
}

async function displayLostAndFound(
    lnfContainer: HTMLElement,
    isCreator: boolean,
    eventId: string | number
): Promise<void> {
    lnfContainer.appendChild(createElement("h2", {}, ["Lost And Found"]));
    lnfContainer.appendChild(createElement("p", {}, ["Did anyone lose or find something?"]));

    // Container for buttons + form
    const actionsContainer = createElement("div", { id: "lostFoundActions" }, []) as HTMLElement;
    lnfContainer.appendChild(actionsContainer);

    // Form section (initially empty, shows when a button is clicked)
    const formSection = createElement("div", { id: "lostFoundForm" }, []) as HTMLElement;

    // Helper: show form
    function showForm(type: "lost" | "found"): void {
        formSection.innerHTML = "";
        formSection.appendChild(createElement("h3", {}, [`Report ${type === "lost" ? "Lost" : "Found"} Item`]));

        const nameInput = createElement("input", { type: "text", placeholder: "Item name" }) as HTMLInputElement;
        const descInput = createElement("textarea", { placeholder: "Description" }) as HTMLTextAreaElement;

        // Updated to use ButtonOptions object structure
        const submitBtn = Button({
            title: "Submit",
            classes: "buttonx primary",
            events: {
                click: async () => {
                    const name = nameInput.value.trim();
                    const description = descInput.value.trim();
                    if (!name) {
                        alert("Name is required");
                        return;
                    }

                    const newItem = { type, name, description };
                    try {
                        await createLostAndFoundItem(eventId, newItem);
                        lnfContainer.innerHTML = "";
                        await displayLostAndFound(lnfContainer, isCreator, eventId);
                    } catch (_err) {
                        alert("Failed to add item.");
                    }
                }
            }
        });

        formSection.appendChild(nameInput);
        formSection.appendChild(descInput);
        formSection.appendChild(submitBtn);
    }

    // Two buttons (available to everyone) updated to use ButtonOptions object structure
    const btnLost = Button({
        title: "I lost something",
        id: "btnLost",
        classes: "buttonx primary",
        events: {
            click: () => showForm("lost")
        }
    });

    const btnFound = Button({
        title: "I found something",
        id: "btnFound",
        classes: "buttonx primary",
        events: {
            click: () => showForm("found")
        }
    });

    actionsContainer.appendChild(btnLost);
    actionsContainer.appendChild(btnFound);
    actionsContainer.appendChild(formSection);

    // Fetch items (after rendering buttons + form placeholder)
    let items: LostAndFoundItem[] = [];
    try {
        items = await fetchLostAndFoundForEvent(eventId);
    } catch (_err) {
        lnfContainer.appendChild(createElement("p", {}, ["Failed to load items."]));
        return;
    }

    // Items list
    const itemsList = createElement("div", { id: "lostFoundItems" }, []) as HTMLElement;
    if (items.length === 0) {
        itemsList.appendChild(createElement("p", {}, ["No items reported yet."]));
    } else {
        items.forEach(item => {
            const itemEl = createElement("div", { "data-id": String(item.id) }, [
                createElement("p", {}, [`[${item.type.toUpperCase()}] ${item.name}`]),
                createElement("p", {}, [`Description: ${item.description}`]),
                createElement("p", {}, [`Reported by: ${item.reportedBy}`])
            ]);
            itemsList.appendChild(itemEl);
        });
    }
    lnfContainer.appendChild(itemsList);
}

async function displayContactDetails(
    container: HTMLElement,
    _isCreator: boolean,
    _contacts: unknown
): Promise<void> {
    container.appendChild(createElement('h2', {}, ["ContactDetails"]));
    container.appendChild(createElement('p', {}, ["Does anybody need anything?"]));
}

async function displayLivestream(
    divcontainer: HTMLElement,
    eventId: string | number,
    isLoggedIn: boolean
): Promise<void> {
    await displayEventLiveStream(divcontainer, eventId, isLoggedIn);
}

async function displayEventLiveStream(
    divcontainer: HTMLElement,
    eventId: string | number,
    isLoggedIn: boolean
): Promise<void> {
    if (!isLoggedIn) {
        divcontainer.innerHTML = "<p>Please log in to watch.</p>";
        return;
    }

    divcontainer.appendChild(createElement('h2', {}, ["Livestream"]));

    try {
        // Fetch available angles
        const response = await fetch(`${API_URL}/livestream/${eventId}`);

        if (response.status === 404) {
            divcontainer.appendChild(createElement("p", {}, ["No livestream available."]));
            return;
        }

        const data: LivestreamResponse = await response.json();
        const angles = data.angles;

        if (!angles || !angles.length) {
            divcontainer.innerHTML = "<p>No livestream available.</p>";
            return;
        }

        // Create video element
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;
        video.style.width = "100%";
        divcontainer.appendChild(video);

        // Create angle selection
        const angleSelector = document.createElement("select");
        angles.forEach((angle) => {
            const option = document.createElement("option");
            option.value = angle.url;
            option.textContent = angle.name;
            angleSelector.appendChild(option);
        });

        angleSelector.onchange = () => {
            video.src = angleSelector.value;
            video.play();
        };

        divcontainer.appendChild(angleSelector);

        // Start with the first angle
        video.src = angles[0].url;
        video.play();
    } catch (err) {
        console.error("Failed to load livestream:", err);
        divcontainer.appendChild(createElement("p", {}, ["Error loading livestream."]));
    }
}

export { displayEventVenue, displayEventFAQ, displayEventReviews, displayLivestream };
export { displayLostAndFound, displayContactDetails };