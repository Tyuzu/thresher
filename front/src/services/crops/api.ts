import { apiFetch } from "../../api/api.js";

export async function createCropForFarm(farmId: string, formData: FormData | Record<string, unknown>): Promise<any> {
  return await apiFetch(`/farms/farm/${farmId}/crops`, "POST", formData);
}

export async function updateFarm(farmId: string | number, formData: Record<string, any> | FormData): Promise<any> {
  return await apiFetch(`/farms/farm/${farmId}`, "PUT", formData, {});
}

export async function fetchFarmDetails(farmId: string | number): Promise<any> {
  return await apiFetch(`/farms/farm/${farmId}`);
}

export async function fetchFarms(page: number, limit: number): Promise<any> {
  return await apiFetch(`/farms?page=${page}&limit=${limit}`);
}

export async function fetchMyFarms(): Promise<any> {
  return await apiFetch("/dash/farms");
}

export async function fetchCategoryItems(queryString: string = ""): Promise<any> {
  const endpoint = `/crops${queryString ? `?${queryString}` : ""}`;
  return await apiFetch(endpoint);
}

export async function acceptFarmOrder(orderId: string | number): Promise<any> {
  return await apiFetch(`/farmorders/order/${orderId}/accept`, "POST");
}

export async function rejectFarmOrder(orderId: string | number): Promise<any> {
  return await apiFetch(`/farmorders/order/${orderId}/reject`, "POST");
}

export async function deliverFarmOrder(orderId: string | number): Promise<any> {
  return await apiFetch(`/farmorders/order/${orderId}/deliver`, "POST");
}

export async function markFarmOrderPaid(orderId: string | number): Promise<any> {
  return await apiFetch(`/farmorders/order/${orderId}/markpaid`, "POST");
}

export async function bulkAcceptFarmOrders(orderIds: (string | number)[]): Promise<any> {
  return await apiFetch("/farmorders/bulk/accept", "POST", { orderIds });
}

export async function bulkRejectFarmOrders(orderIds: (string | number)[]): Promise<any> {
  return await apiFetch("/farmorders/bulk/reject", "POST", { orderIds });
}

export async function bulkDeliverFarmOrders(orderIds: (string | number)[]): Promise<any> {
  return await apiFetch("/farmorders/bulk/deliver", "POST", { orderIds });
}

export async function fetchIncomingFarmOrders(url: string): Promise<any> {
  return await apiFetch(url);
}

export async function fetchWeather(): Promise<any> {
  return await apiFetch("/weather");
}

export default {
  createCropForFarm,
  updateFarm,
  fetchFarmDetails,
  fetchFarms,
  fetchMyFarms,
  fetchCategoryItems,
  acceptFarmOrder,
  rejectFarmOrder,
  deliverFarmOrder,
  markFarmOrderPaid,
  bulkAcceptFarmOrders,
  bulkRejectFarmOrders,
  bulkDeliverFarmOrders,
  fetchIncomingFarmOrders,
  fetchWeather
};
