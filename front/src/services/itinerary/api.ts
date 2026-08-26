import { apiFetch } from "../../api/api.js";

export interface ItineraryVisitApi {
  start_time?: string;
  end_time?: string;
  location?: string;
  transport?: string;
  [key: string]: unknown;
}

export interface ItineraryDayApi {
  date?: string;
  visits?: ItineraryVisitApi[];
  [key: string]: unknown;
}

export interface ItineraryApiItem {
  itineraryid?: string | number;
  userid?: string | number;
  name?: string;
  status?: string;
  published?: boolean;
  start_date?: string;
  end_date?: string;
  description?: string;
  days?: ItineraryDayApi[];
  [key: string]: unknown;
}

export async function fetchItineraries(): Promise<ItineraryApiItem[] | { data?: ItineraryApiItem[]; [key: string]: unknown }> {
  return await apiFetch("/itineraries");
}

export async function searchItinerariesApi(queryString: string): Promise<ItineraryApiItem[] | { data?: ItineraryApiItem[]; [key: string]: unknown }> {
  return await apiFetch(`/itineraries/search?${queryString}`);
}

export async function fetchItineraryById(id: string | number): Promise<ItineraryApiItem | { data?: ItineraryApiItem; [key: string]: unknown }> {
  return await apiFetch(`/itineraries/all/${id}`);
}

export async function createItineraryRequest(payload: Record<string, unknown>): Promise<any> {
  return await apiFetch("/itineraries", "POST", payload);
}

export async function updateItineraryRequest(id: string | number, payload: Record<string, unknown>): Promise<any> {
  return await apiFetch(`/itineraries/${id}`, "PUT", payload);
}

export async function deleteItineraryRequest(id: string | number): Promise<any> {
  return await apiFetch(`/itineraries/${id}`, "DELETE");
}

export async function forkItineraryRequest(id: string | number): Promise<any> {
  return await apiFetch(`/itineraries/${id}/fork`, "POST");
}

export async function publishItineraryRequest(id: string | number): Promise<any> {
  return await apiFetch(`/itineraries/${id}/publish`, "PUT");
}
