// itineraryService.ts
import { apiFetch } from "../../api/api.js";
import { renderItineraryForm } from "./createOrEditItinerary.js";

interface Itinerary {
    id?: string | number;
    [key: string]: unknown;
}

export async function editItinerary(
    container: HTMLElement,
    isLoggedIn: boolean,
    id: string | number
): Promise<void> {
    const response = (await apiFetch(`/itineraries/all/${id}`)) as { data?: Itinerary; [key: string]: unknown };
    const itinerary = response?.data || response;
    renderItineraryForm(container, isLoggedIn, "edit", itinerary);
}
