import { createElement } from "../../components/createElement.js";

export interface MapOptions {
  mapImage: string;
  mapWidth: number;
  mapHeight: number;
  mapBounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  currentLocation?: { lat: number; lon: number };
  markers?: Array<{ lat: number; lon: number; name?: string }>;
  showLegend?: boolean;
}

export function displayDynamicMap(container: HTMLElement, options: MapOptions): void {
  if (!container) return;
  const mapEl = createElement("div", { class: "dynamic-map-placeholder" }, [
    createElement("p", {}, ["Map placeholder"])
  ]) as HTMLElement;
  container.appendChild(mapEl);
}
