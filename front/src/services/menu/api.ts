import { apiFetch } from "../../api/api.js";

export interface MenuItem {
  menuid: string | number;
  name: string;
  price: number;
  discount?: number;
  stock: number;
  menu_pic?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface StockResponse {
  stock: number;
}

export async function fetchMenuByPlace(placeId: string | number): Promise<MenuItem[]> {
  return await apiFetch<MenuItem[]>(`/places/menu/${placeId}`);
}

export async function fetchMenuItem(placeId: string | number, menuId: string | number): Promise<MenuItem> {
  return await apiFetch<MenuItem>(`/places/menu/${placeId}/${menuId}`);
}

export async function createMenuItem(
  placeId: string | number,
  payload: Record<string, unknown>
): Promise<ApiResponse<MenuItem>> {
  return await apiFetch<ApiResponse<MenuItem>>(`/places/menu/${placeId}`, "POST", payload);
}

export async function updateMenuItem(
  placeId: string | number,
  menuId: string | number,
  payload: Record<string, unknown>
): Promise<ApiResponse> {
  return await apiFetch<ApiResponse>(`/places/menu/${placeId}/${menuId}`, "PUT", payload);
}

export async function deleteMenuItem(placeId: string | number, menuId: string | number): Promise<ApiResponse> {
  return await apiFetch<ApiResponse>(`/places/menu/${placeId}/${menuId}`, "DELETE");
}

export async function getMenuStock(placeId: string | number, menuId: string | number): Promise<StockResponse> {
  return await apiFetch<StockResponse>(`/places/menu/${placeId}/${menuId}/stock`);
}

export async function confirmMenuPurchase(
  placeId: string | number,
  menuId: string | number,
  payload: Record<string, unknown>
): Promise<ApiResponse> {
  return await apiFetch<ApiResponse>(`/places/menu/${placeId}/${menuId}/confirm-purchase`, "POST", payload);
}
