import { apiFetch } from "../../api/api.js";

const BASE_URL = "/deliveries";

// --- DELIVERIES ---
export async function fetchAllDeliveries(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`${BASE_URL}${query ? `?${query}` : ""}`, "GET");
}

export async function fetchDeliveryById(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}`, "GET");
}

export async function createDeliveryRequest(deliveryData) {
  return await apiFetch(BASE_URL, "POST", deliveryData);
}

export async function cancelDelivery(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}`, "DELETE");
}

// --- LIFECYCLE ---
export async function updateDeliveryLifecycle(deliveryId, action, body = null) {
  if (action === "cancel") {
    return await cancelDelivery(deliveryId);
  }
  return await apiFetch(`${BASE_URL}/${deliveryId}/${action}`, "POST", body);
}

// --- TRACKING & PROOF ---
export async function fetchDeliveryTracking(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}/tracking`, "GET");
}

export async function fetchDeliveryLocation(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}/location`, "GET");
}

export async function fetchDeliveryEvents(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}/events`, "GET");
}

export async function fetchStatusHistory(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}/status-history`, "GET");
}

export async function addProofOfDelivery(deliveryId, proofData) {
  return await apiFetch(`${BASE_URL}/${deliveryId}/proof`, "POST", proofData);
}

export async function getProofOfDelivery(deliveryId) {
  return await apiFetch(`${BASE_URL}/${deliveryId}/proof`, "GET");
}

// --- PUBLIC TRACKING ---
export async function fetchPublicTracking(token) {
  return await apiFetch(`/tracking/${token}`, "GET");
}

export async function fetchPublicLocation(token) {
  return await apiFetch(`/tracking/${token}/location`, "GET");
}

// --- DRIVER ENDPOINTS ---
export async function fetchDriverProfile() {
  return await apiFetch("/drivers/me", "GET");
}

export async function updateDriverProfile(data) {
  return await apiFetch("/drivers/me", "PATCH", data);
}

export async function setDriverOnline() {
  return await apiFetch("/drivers/me/online", "POST");
}

export async function setDriverOffline() {
  return await apiFetch("/drivers/me/offline", "POST");
}

export async function fetchDriverStatus() {
  return await apiFetch("/drivers/me/status", "GET");
}

export async function fetchAvailableJobs() {
  return await apiFetch("/drivers/me/deliveries", "GET");
}

export async function fetchActiveDeliveries() {
  return await apiFetch("/drivers/me/deliveries/active", "GET");
}

export async function acceptDriverJob(deliveryId) {
  return await apiFetch(`/drivers/me/deliveries/${deliveryId}/accept`, "POST");
}

export async function rejectDriverJob(deliveryId) {
  return await apiFetch(`/drivers/me/deliveries/${deliveryId}/reject`, "POST");
}

export async function sendGPSLocation(locationData) {
  return await apiFetch("/drivers/me/location", "POST", locationData);
}

export async function getCurrentGPS() {
  return await apiFetch("/drivers/me/location", "GET");
}

// --- WEBHOOKS ---
export async function createWebhook(data) {
  return await apiFetch("/webhooks", "POST", data);
}

export async function listWebhooks() {
  return await apiFetch("/webhooks", "GET");
}

export async function getWebhook(webhookId) {
  return await apiFetch(`/webhooks/${webhookId}`, "GET");
}

export async function updateWebhook(webhookId, data) {
  return await apiFetch(`/webhooks/${webhookId}`, "PATCH", data);
}

export async function deleteWebhook(webhookId) {
  return await apiFetch(`/webhooks/${webhookId}`, "DELETE");
}

export async function testWebhook(webhookId) {
  return await apiFetch(`/webhooks/${webhookId}/test`, "POST");
}

// new


export async function claimDelivery() {
  return await apiFetch("/drivers/me", "GET");
}


export async function updateDeliveryStatus() {
  return await apiFetch("/drivers/me", "GET");
}