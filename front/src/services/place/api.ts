import { apiFetch } from "../../api/api.js";
import type { Place } from "./placeDetails.js";

export interface CreatePlaceResponse {
  placeid: string;
  name: string;
  [key: string]: unknown;
}

export interface UpdatePlaceResponse extends CreatePlaceResponse {}

export interface PlacesResponse {
  data?: Place[];
  places?: Place[];
  [key: string]: unknown;
}

export type QueryParams = Record<string, string | number | boolean>;

export async function getPlaceById(placeId: string): Promise<Place> {
  return await apiFetch<Place>(`/places/place/${placeId}`);
}

export async function listPlacesRequest(page = 1, limit = 100): Promise<PlacesResponse | Place[]> {
  return await apiFetch<PlacesResponse | Place[]>(`/places/places?page=${page}&limit=${limit}`);
}

export async function fetchPlacesApi(
  page: number = 1,
  limit: number = 20,
  queryParams: QueryParams = {}
): Promise<Place[] | null> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...Object.fromEntries(
      Object.entries(queryParams).map(([key, value]) => [key, String(value)])
    )
  });

  try {
    const places = await apiFetch<Place[]>(`/places/places?${params.toString()}`);
    return Array.isArray(places) ? places : [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }

    console.error("Error fetching places:", error);
    return null;
  }
}

export async function createPlaceRequest(formData: FormData): Promise<CreatePlaceResponse> {
  return await apiFetch<CreatePlaceResponse>("/places/place", "POST", formData);
}

export async function updatePlaceRequest(placeId: string, formData: FormData): Promise<UpdatePlaceResponse> {
  return await apiFetch<UpdatePlaceResponse>(`/places/place/${placeId}`, "PUT", formData);
}

export async function deletePlaceRequest(placeId: string): Promise<void> {
  await apiFetch(`/places/place/${placeId}`, "DELETE");
}

export default {
  getPlaceById,
  listPlacesRequest,
  fetchPlacesApi,
  createPlaceRequest,
  updatePlaceRequest,
  deletePlaceRequest
};
