import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.js";
import { Place } from "./placeDetails.js";

export type QueryParams = Record<string, string | number | boolean>;

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
  const abortController = new AbortController();
  const signal = abortController.signal;

  // Convert all params to string values for URLSearchParams
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...Object.fromEntries(
      Object.entries(queryParams).map(([key, value]) => [key, String(value)])
    )
  });

  try {
    const places = await apiFetch<Place[]>(
      `/places/places?${params.toString()}`,
      "GET",
      null,
      { signal }
    );
    return Array.isArray(places) ? places : [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    
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