import { apiFetch } from "../../api/api.js";

export type TicketStatus = "Active" | "Transferred" | "Cancelled" | string;

export interface TicketData {
  ticketid: string | number;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  color?: string;
  seatstart?: number;
  seatend?: number;
  [key: string]: unknown;
}

export interface TicketPayload {
  name: string;
  price: number;
  quantity: number;
  currency: string;
  color: string;
  seatstart: number;
  seatend: number;
}

export interface UserTicket {
  ticketid: string | number;
  uniquecode: string;
  buyername: string;
  purchasedate: string | number | Date;
  status: TicketStatus;
  canceled?: boolean;
  refundstatus?: string;
  transferredto?: string;
  [key: string]: unknown;
}

export async function fetchTicketData(
  ticketId: string | number,
  eventId: string | number
): Promise<TicketData> {
  return await apiFetch<TicketData>(`/ticket/event/${eventId}/${ticketId}`, "GET");
}

export async function updateTicketRequest(
  ticketId: string | number,
  eventId: string | number,
  payload: TicketPayload
): Promise<void> {
  await apiFetch<void>(`/ticket/event/${eventId}/${ticketId}`, "PUT", payload);
}

export async function deleteTicketRequest(
  ticketId: string | number,
  eventId: string | number
): Promise<void> {
  await apiFetch<void>(`/ticket/event/${eventId}/${ticketId}`, "DELETE");
}

export async function fetchMyTickets(eventid: string | number): Promise<UserTicket[]> {
  return await apiFetch<UserTicket[]>(`/ticket/mytickets/${eventid}`, "GET");
}

export async function cancelTicketRequest(
  eventid: string | number,
  uniquecode: string
): Promise<void> {
  await apiFetch<void>(`/ticket/cancel/${eventid}`, "POST", { uniquecode });
}

export default {
  fetchTicketData,
  updateTicketRequest,
  deleteTicketRequest,
  fetchMyTickets,
  cancelTicketRequest
};
