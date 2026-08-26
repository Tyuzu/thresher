import { SEARCH_URL } from "../../state/state.js";
import Notify from "../../components/ui/Notify.js";

export interface SearchItem {
  id?: string;
  entityid?: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export type SearchResult = SearchItem[] | Record<string, SearchItem[]>;

async function searchApiFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    const error = err as Error;
    Notify(`API error: ${error.message}`, { type: "error", duration: 3000 });
    return null;
  }
}

export async function fetchSearchResults(tabId: string, query: string): Promise<SearchResult | null> {
  const url = `${SEARCH_URL}/search/${tabId}?query=${encodeURIComponent(query)}`;
  return await searchApiFetch<SearchResult>(url);
}

export async function fetchAutocompleteSuggestions(query: string): Promise<string[]> {
  const url = `${SEARCH_URL}/ac?prefix=${encodeURIComponent(query)}`;
  const res = await fetch(url);

  if (!res.ok) {
    return [];
  }

  const suggestions = await res.json();
  return Array.isArray(suggestions) ? (suggestions as string[]) : [];
}

export default {
  fetchSearchResults,
  fetchAutocompleteSuggestions
};
