// itineraryService.ts
import { renderItineraryForm } from "./createOrEditItinerary.js";
import { fetchItineraryById, type ItineraryApiItem } from "./api.js";

interface Itinerary {
    id?: string | number;
    [key: string]: unknown;
}

export async function editItinerary(
    container: HTMLElement,
    isLoggedIn: boolean,
    id: string | number
): Promise<void> {
    const response = await fetchItineraryById(id);
    const itinerary = ((response as { data?: ItineraryApiItem })?.data ?? (response as ItineraryApiItem)) as Itinerary;
    renderItineraryForm(container, isLoggedIn, "edit", itinerary);
}
