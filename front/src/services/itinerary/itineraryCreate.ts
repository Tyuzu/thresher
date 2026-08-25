// itineraryService.ts
import { apiFetch } from "../../api/api.js";
import { renderItineraryForm } from "./createOrEditItinerary.js";

interface Itinerary {
    id?: string | number;
    [key: string]: unknown;
}

export function createItinerary(
    isLoggedIn: boolean,
    container: HTMLElement
): void {
    renderItineraryForm(container, isLoggedIn, "create",{});
}