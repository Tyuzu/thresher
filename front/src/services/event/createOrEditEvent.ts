import { API_URL, getState } from "../../state/state.js";
import { navigate } from "../../routes/navigate.js";
import { createEventRequest, updateEventRequest } from "./api.js";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { Button } from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.js";
import { debounce } from "../../utils/deutils.js";

// --- Type Definitions / Interfaces ---

export interface EventFormInputData {
    eventid?: string | number;
    category?: string;
    title?: string;
    description?: string;
    location?: string;
    placename?: string;
    placeid?: string | number;
    date?: string | Date;
    [key: string]: unknown;
}

interface PlaceSuggestion {
    id: string | number;
    name: string;
    [key: string]: unknown;
}

interface FormFieldConfig {
    type: string;
    id: string;
    label: string;
    value?: string | number;
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
}

/** Add autocomplete listeners for the place input */
function addAutoConListeners(eventPlaceInput: HTMLInputElement): void {
    async function fetchPlaceSuggestions(): Promise<void> {
        const query = eventPlaceInput.value.trim();
        const autocompleteList = document.getElementById("ac-list") as HTMLElement | null;

        if (!autocompleteList) return;

        if (!query) {
            autocompleteList.replaceChildren();
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/ac/places?query=${encodeURIComponent(query)}`
            );
            const suggestions: PlaceSuggestion[] = await response.json();

            autocompleteList.replaceChildren();
            suggestions.forEach(suggestion => {
                const item = createElement("li", { class: "ac-item" }, [suggestion.name]) as HTMLElement;
                item.addEventListener("click", () => {
                    eventPlaceInput.value = suggestion.name;
                    eventPlaceInput.dataset.id = String(suggestion.id);
                    autocompleteList.replaceChildren();
                });
                autocompleteList.appendChild(item);
            });
            autocompleteList.style.display = suggestions.length ? "block" : "none";

        } catch (err) {
            console.error("Autocomplete fetch error:", err);
        }
    }

    const debouncedFetch = debounce(fetchPlaceSuggestions, 300);
    eventPlaceInput.addEventListener("input", debouncedFetch);

    eventPlaceInput.addEventListener("keydown", (e: KeyboardEvent) => {
        const autocompleteList = document.getElementById("ac-list") as HTMLElement | null;
        if (!autocompleteList) return;

        const items = Array.from(autocompleteList.querySelectorAll(".ac-item")) as HTMLElement[];
        if (!items.length) {
            return;
        }

        let index = items.findIndex(i => i.classList.contains("selected"));
        if (e.key === "ArrowDown") {
            e.preventDefault(); 
            index = index < items.length - 1 ? index + 1 : 0;
        } else if (e.key === "ArrowUp") {
            e.preventDefault(); 
            index = index > 0 ? index - 1 : items.length - 1;
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (index >= 0) {
                eventPlaceInput.value = items[index].textContent || "";
                autocompleteList.replaceChildren();
            }
            return;
        }

        items.forEach(i => i.classList.remove("selected"));
        if (items[index]) {
            items[index].classList.add("selected");
        }
    });
}

/** Submit or update event */
async function submitEvent(
    form: HTMLFormElement, 
    isLoggedIn: boolean, 
    eventId: string | number | null = null
): Promise<void> {
    const userState = getState("user");
    if (!isLoggedIn || !userState?.userid) {
        navigate('/login');
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity(); 
        return;
    }

    const placeInput = form.querySelector("#event-place") as HTMLInputElement | null;
    const payload: Record<string, any> = {
        category: (form.querySelector("#event-category") as HTMLSelectElement)?.value,
        title: (form.querySelector("#event-title") as HTMLInputElement)?.value.trim(),
        description: (form.querySelector("#event-description") as HTMLTextAreaElement)?.value.trim(),
        location: (form.querySelector("#event-location") as HTMLInputElement)?.value.trim(),
        placename: placeInput?.value.trim(),
        placeid: placeInput?.dataset.id || "",
    };

    const date = (form.querySelector("#event-date") as HTMLInputElement)?.value;
    let time = (form.querySelector("#event-time") as HTMLInputElement)?.value || "00:00:00";
    if (time.length === 5) {
        time += ":00";
    } // ensure HH:MM:SS
    payload.date = new Date(`${date}T${time}`).toISOString();

    const formData = new FormData();
    formData.append("event", JSON.stringify(payload));

    const bannerFile = (form.querySelector("#event-banner") as HTMLInputElement)?.files?.[0];
    const seatingFile = (form.querySelector("#event-seating") as HTMLInputElement)?.files?.[0];
    if (bannerFile) {
        formData.append("event-banner", bannerFile);
    }
    if (seatingFile) {
        formData.append("event-seating", seatingFile);
    }

    try {
        const url = eventId ? `/events/event/${eventId}` : `/events/event`;
        const method = eventId ? "PUT" : "POST";
        const result: any = eventId ? await updateEventRequest(eventId, formData) : await createEventRequest(formData);

        Notify(`Event ${eventId ? "updated" : "created"} successfully: ${result?.title || ""}`, { type: "success", duration: 3000, dismissible: true });
        if (!eventId && result?.eventid) {
            navigate(`/event/${result.eventid}`);
        }
    } catch (err: any) {
        console.error(err);
        Notify(`Error submitting event: ${err?.message || err}`, { type: "error", duration: 3000, dismissible: true });
    }
}

/** Generate event form with optional prefilled data */
function generateEventForm(
    isLoggedIn: boolean, 
    container: HTMLElement, 
    eventData: EventFormInputData = {}
): void {
    if (!isLoggedIn) {
        Notify("Please log in.", { type: "warning", duration: 3000, dismissible: true });
        navigate("/login");
        return;
    }

    container.replaceChildren();
    const section = createElement("div", { class: "create-section" }) as HTMLElement;
    section.appendChild(createElement("h2", {}, [eventData.eventid ? "Edit Event" : "Create Event"]));

    const form = createElement("form", { class: "event-form" }) as HTMLFormElement;
    const fields: FormFieldConfig[] = [
        {
            type: "select", id: "event-category", label: "Event Type", required: true,
            value: eventData.category || "",
            placeholder: "Select a Type",
            options: ["Conference", "Concert", "Sports", "Festival", "Meetup", "Workshop", "Other"].map(v => ({ value: v, label: v }))
        },
        { type: "text", id: "event-title", label: "Event Title", value: eventData.title || "", placeholder: "Enter title", required: true },
        { type: "textarea", id: "event-description", label: "Description", value: eventData.description || "", placeholder: "Enter description", required: true },
        { type: "text", id: "event-place", label: "Place", value: eventData.placename || "", placeholder: "Enter place", required: true },
        { type: "text", id: "event-location", label: "Location", value: eventData.location || "", placeholder: "Enter location", required: true },
        { type: "date", id: "event-date", label: "Date", value: eventData.date ? new Date(eventData.date).toISOString().split("T")[0] : "", required: true },
        { type: "time", id: "event-time", label: "Time", value: eventData.date ? new Date(eventData.date).toTimeString().split(" ")[0] : "", required: true },
    ];

    fields.forEach(f => {
        if (f.id === "event-place") {
            const wrapper = createElement("div", { class: "suggestions-container" }) as HTMLElement;
            wrapper.appendChild(createFormGroup(f));
            wrapper.appendChild(createElement("ul", { id: "ac-list", class: "ac-list" }));
            form.appendChild(wrapper);
        } else {
            form.appendChild(createFormGroup(f));
        }
    });

    // Updated Button to match options object structure
    const submitBtn = Button({
        title: eventData.eventid ? "Update Event" : "Create Event",
        classes: "buttonx",
        events: {
            click: (e: Event) => {
                e.preventDefault(); 
                submitEvent(form, isLoggedIn, eventData.eventid || null);
            }
        }
    });

    form.appendChild(submitBtn);

    section.appendChild(form);
    container.appendChild(section);

    const placeInput = form.querySelector("#event-place") as HTMLInputElement | null;
    if (placeInput) {
        addAutoConListeners(placeInput);
    }
}

export { generateEventForm, submitEvent };