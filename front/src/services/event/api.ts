import { apiFetch } from "../../api/api.js";

export async function fetchEventById(eventId: string | number): Promise<any> {
  return await apiFetch(`/events/event/${eventId}`);
}

export async function fetchEventsPage(page: number = 1, limit: number = 1000): Promise<any> {
  return await apiFetch(`/events/events?page=${page}&limit=${limit}`);
}

export async function createEventRequest(formData: FormData): Promise<any> {
  return await apiFetch(`/events/event`, "POST", formData);
}

export async function updateEventRequest(eventId: string | number, formData: FormData): Promise<any> {
  return await apiFetch(`/events/event/${eventId}`, "PUT", formData);
}

export async function fetchEventMerch(eventId: string | number): Promise<any> {
  return await apiFetch(`/merch/event/${eventId}`);
}

export async function fetchFaqsForEvent(eventId: string | number): Promise<any> {
  return await apiFetch(`/faqs/event/${eventId}`);
}

export async function createFaqForEvent(eventId: string | number, title: string, content: string): Promise<any> {
  return await apiFetch(`/events/event/${eventId}/faqs`, "POST", { title, content });
}

export async function fetchLostAndFoundForEvent(eventId: string | number): Promise<any> {
  return await apiFetch(`/events/${eventId}/lostfound`);
}

export async function createLostAndFoundItem(eventId: string | number, payload: Record<string, any>): Promise<any> {
  return await apiFetch(`/events/${eventId}/lostfound`, "POST", payload);
}

export default {
  fetchEventById,
  fetchEventsPage,
  createEventRequest,
  updateEventRequest,
  fetchEventMerch,
  fetchFaqsForEvent,
  createFaqForEvent,
  fetchLostAndFoundForEvent,
  createLostAndFoundItem
};
