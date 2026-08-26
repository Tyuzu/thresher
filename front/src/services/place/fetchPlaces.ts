import Notify from "../../components/ui/Notify.js";
import { Place } from "./placeDetails.js";
import { fetchPlacesApi, type QueryParams } from "./api.js";

/**
 * Fetch paginated places with optional filters.
 *
 * @param page - Current page (starting from 1)
 * @param limit - Items per page
 * @param queryParams - Optional query params to append
 * @returns Array of places or null if request fails or is aborted
 */
async function fetchPlaces(
  page: number = 1,
  limit: number = 20,
  queryParams: QueryParams = {}
): Promise<Place[] | null> {
  try {
    const places = await fetchPlacesApi(page, limit, queryParams);
    if (places === null) {
      return null;
    }

    return places;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching places:", error);
    Notify(`Error fetching places: ${message}`, {
      type: "error",
      duration: 3000,
      dismissible: true
    });
    return null;
  }
}

export { fetchPlaces };