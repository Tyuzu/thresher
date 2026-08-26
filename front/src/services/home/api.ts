import { apiFetch } from "../../api/api.js";

export interface HomeCardItem {
  banner?: string;
  title?: string;
  description?: string;
  href: string;
}

export async function fetchHomeCards(
  category: string,
  skip: number,
  limit: number
): Promise<HomeCardItem[]> {
  return await apiFetch<HomeCardItem[]>(`/homecards?category=${encodeURIComponent(category)}&skip=${skip}&limit=${limit}`, "GET");
}
