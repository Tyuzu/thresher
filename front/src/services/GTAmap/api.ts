import { apiFetch } from "../../api/api.js";

export async function fetchGtaMapData(
  entity: string,
  isLoggedIn: boolean,
  initialMarker?: string | null,
  initialX?: number | null,
  initialY?: number | null
): Promise<any> {
  let endpoint = `/gta/map?entity=${entity}&auth=${isLoggedIn}`;
  if (initialMarker) endpoint += `&marker=${initialMarker}`;
  if (initialX !== null && initialX !== undefined && initialY !== null && initialY !== undefined) {
    endpoint += `&x=${initialX}&y=${initialY}`;
  }

  return await apiFetch(endpoint);
}

export async function fetchGtaMapDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Promise<any> {
  return await apiFetch(`/gta/map/distance?x1=${x1}&y1=${y1}&x2=${x2}&y2=${y2}`);
}
