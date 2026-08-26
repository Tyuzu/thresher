import { apiFetch } from "../../api/api.js";

const BASE_URL = "/deliveries";

// --- INTERFACES & TYPES ---
export interface DeliveryLocation {
  address?: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
}

export interface DeliveryData {
  pickup_loc?: DeliveryLocation;
  dropoff_loc?: DeliveryLocation;
  pickup_contact?: string;
  dropoff_contact?: string;
  payout?: number | string;
  vehicle_type?: string;
  [key: string]: any;
}

export interface StatusData {
  status: string;
  otp?: string;
  [key: string]: any;
}

export interface ProofData {
  url?: string;
  recipient_name?: string;
  notes?: string;
  [key: string]: any;
}

export interface DriverProfileData {
  name?: string;
  phone?: string;
  vehicle_type?: string;
  [key: string]: any;
}

export interface GPSLocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  [key: string]: any;
}

export interface WebhookData {
  url: string;
  events: string[];
  [key: string]: any;
}

// --- DELIVERIES ---
export async function fetchAllDeliveries(params: Record<string, any> = {}): Promise<any> {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`${BASE_URL}${query ? `?${query}` : ""}`, "GET");
}

export async function fetchDeliveryById(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}`, "GET");
}

export async function createDeliveryRequest(deliveryData: DeliveryData): Promise<any> {
  return await apiFetch(BASE_URL, "POST", deliveryData);
}

export async function cancelDelivery(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}`, "DELETE");
}

// --- LIFECYCLE & STATUS UPDATES ---
export async function updateDeliveryLifecycle(
  deliveryId: string | number,
  action: string,
  body: any = null
): Promise<any> {
  if (action === "cancel") {
    return await cancelDelivery(deliveryId);
  }
  return await apiFetch(`${BASE_URL}/${deliveryId}/${action}`, "POST", body);
}

export async function updateDeliveryStatus(
  deliveryId: string | number,
  statusData: StatusData
): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/status`, "PATCH", statusData);
}

// --- TRACKING & PROOF ---
export async function fetchDeliveryTracking(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/tracking`, "GET");
}

export async function fetchDeliveryLocation(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/location`, "GET");
}

export async function fetchDeliveryEvents(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/events`, "GET");
}

export async function fetchStatusHistory(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/status-history`, "GET");
}

export async function addProofOfDelivery(
  deliveryId: string | number,
  proofData: ProofData
): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/proof`, "POST", proofData);
}

export async function getProofOfDelivery(deliveryId: string | number): Promise<any> {
  return await apiFetch(`${BASE_URL}/${deliveryId}/proof`, "GET");
}

// --- PUBLIC TRACKING ---
export async function fetchPublicTracking(token: string): Promise<any> {
  return await apiFetch(`/tracking/${token}`, "GET");
}

export async function fetchPublicLocation(token: string): Promise<any> {
  return await apiFetch(`/tracking/${token}/location`, "GET");
}

// --- DRIVER ENDPOINTS ---
export async function fetchDriverProfile(): Promise<any> {
  return await apiFetch("/drivers/me", "GET");
}

export async function updateDriverProfile(data: DriverProfileData): Promise<any> {
  return await apiFetch("/drivers/me", "PATCH", data);
}

export async function setDriverOnline(): Promise<any> {
  return await apiFetch("/drivers/me/online", "POST");
}

export async function setDriverOffline(): Promise<any> {
  return await apiFetch("/drivers/me/offline", "POST");
}

export async function fetchDriverStatus(): Promise<any> {
  return await apiFetch("/drivers/me/status", "GET");
}

export async function fetchAvailableJobs(): Promise<any> {
  return await apiFetch("/drivers/me/deliveries", "GET");
}

export async function fetchActiveDeliveries(): Promise<any> {
  return await apiFetch("/drivers/me/deliveries/active", "GET");
}

export async function claimDelivery(deliveryId: string | number): Promise<any> {
  return await apiFetch(`/drivers/me/deliveries/${deliveryId}/claim`, "POST");
}

export async function acceptDriverJob(deliveryId: string | number): Promise<any> {
  return await apiFetch(`/drivers/me/deliveries/${deliveryId}/accept`, "POST");
}

export async function rejectDriverJob(deliveryId: string | number): Promise<any> {
  return await apiFetch(`/drivers/me/deliveries/${deliveryId}/reject`, "POST");
}

export async function sendGPSLocation(locationData: GPSLocationData): Promise<any> {
  return await apiFetch("/drivers/me/location", "POST", locationData);
}

export async function getCurrentGPS(): Promise<any> {
  return await apiFetch("/drivers/me/location", "GET");
}

// --- WEBHOOKS ---
export async function createWebhook(data: WebhookData): Promise<any> {
  return await apiFetch("/webhooks", "POST", data);
}

export async function listWebhooks(): Promise<any> {
  return await apiFetch("/webhooks", "GET");
}

export async function getWebhook(webhookId: string | number): Promise<any> {
  return await apiFetch(`/webhooks/${webhookId}`, "GET");
}

export async function updateWebhook(
  webhookId: string | number,
  data: Partial<WebhookData>
): Promise<any> {
  return await apiFetch(`/webhooks/${webhookId}`, "PATCH", data);
}

export async function deleteWebhook(webhookId: string | number): Promise<any> {
  return await apiFetch(`/webhooks/${webhookId}`, "DELETE");
}

export async function testWebhook(webhookId: string | number): Promise<any> {
  return await apiFetch(`/webhooks/${webhookId}/test`, "POST");
}