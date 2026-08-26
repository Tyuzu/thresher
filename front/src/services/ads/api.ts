import { API_URL } from "../../api/api.js";

export interface AdQueryParams {
  page?: string;
  position?: string;
  category?: string;
}

export interface RawAdPayload {
  id?: string;
  ID?: string;
  link?: string;
  Link?: string;
  image?: string;
  Image?: string;
  title?: string;
  Title?: string;
  description?: string;
  Description?: string;
  badge?: string;
  Badge?: string;
  cta?: string;
  CTA?: string;
}

export async function fetchAdPayload(params: AdQueryParams): Promise<RawAdPayload> {
  const page = params.page || "home";
  const position = params.position || "";
  const category = params.category || "";

  const queryParams = new URLSearchParams({ page, position, category });

  const url = `${API_URL}/sda/sda?${queryParams.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  if (!res.ok) {
    throw new Error(`Ad API error HTTP ${res.status}`);
  }

  const data = (await res.json()) as RawAdPayload;
  return data;
}

function beaconOrFetch(path: string): void {
  const url = `${API_URL}${path}`;

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(url);
      return;
    } catch {
      // fall through to fetch
    }
  }

  void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
}

export function trackImpression(adId: string): void {
  if (!adId) return;
  beaconOrFetch(`/sda/track-impression?id=${encodeURIComponent(adId)}`);
}

export function trackClick(adId: string): void {
  if (!adId) return;
  beaconOrFetch(`/sda/track-click?id=${encodeURIComponent(adId)}`);
}

export default { fetchAdPayload, trackImpression, trackClick };
