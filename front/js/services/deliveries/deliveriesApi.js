import { apiFetch } from "../../api/api.js";

export async function fetchAllDeliveries(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/deliveries${query ? `?${query}` : ""}`, "GET");
}

export async function fetchDeliveryById(deliveryId) {
  return await apiFetch(`/deliveries/${deliveryId}`, "GET");
}

export async function createDeliveryRequest(deliveryData) {
  return await apiFetch("/deliveries", "POST", deliveryData);
}

export async function updateDeliveryStatus(deliveryId, status) {
  return await apiFetch(`/deliveries/${deliveryId}/status`, "PATCH", { status });
}