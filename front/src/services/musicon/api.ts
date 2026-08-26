import { musicFetch, type HttpMethod } from "../../api/api.js";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: HttpMethod = "GET",
  body: any = null
): Promise<ApiResponse<T>> {
  try {
    const res = await musicFetch(endpoint, method, body);
    return res || { success: false };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function safeFetch<T = any>(endpoint: string): Promise<T[]> {
  const res = await apiRequest<T[]>(endpoint);
  if (res?.success && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}
