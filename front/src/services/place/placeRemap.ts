import { createElement } from "../../components/createElement.js";

export interface LocationCoordinates {
  lat: number;
  lon: number;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface LockedArea {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export type MarkerType = "event" | "shop" | "enemy" | "place";

export interface MapMarker {
  lat: number;
  lon: number;
  type: MarkerType;
  title: string;
}

export interface PlacesMapOptions {
  defaultLocation?: LocationCoordinates;
  mapImage?: string;
  mapWidth?: number;
  mapHeight?: number;
  mapBounds?: MapBounds;
  markerCount?: number;
  showLegend?: boolean;
  lockedAreas?: LockedArea[];
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  enableInertia?: boolean;
  enableTouch?: boolean;
}

export interface GenericMapConfig extends Required<PlacesMapOptions> {
  currentLocation: LocationCoordinates;
  markers: MapMarker[];
  lonToX: (lonVal: number) => number;
  latToY: (latVal: number) => number;
}

export function displayPlacesMap(options: PlacesMapOptions = {}): HTMLElement {
  const defaultOptions: Required<PlacesMapOptions> = {
    defaultLocation: { lat: 37.7749, lon: -122.4194 },
    mapImage: "",
    mapWidth: 1200,
    mapHeight: 800,
    mapBounds: {
      minLat: 37.700,
      maxLat: 37.830,
      minLon: -122.520,
      maxLon: -122.350,
    },
    markerCount: 8,
    showLegend: true,
    lockedAreas: [
      { x: 480, y: 140, width: 160, height: 120, label: "VIP Zone" },
    ],
    minZoom: 0.5,
    maxZoom: 3,
    zoomStep: 0.1,
    enableInertia: true,
    enableTouch: true,
  };

  // Deep merge for nested option objects to prevent property loss
  const mapOptions: Required<PlacesMapOptions> = {
    ...defaultOptions,
    ...options,
    defaultLocation: {
      ...defaultOptions.defaultLocation,
      ...options.defaultLocation,
    },
    mapBounds: {
      ...defaultOptions.mapBounds,
      ...options.mapBounds,
    },
  };

  const container = createElement("div", { class: "mapcon" }) as HTMLElement;

  const generateMarkers = (bounds: MapBounds, count: number): MapMarker[] => {
    const types: MarkerType[] = ["event", "shop", "enemy", "place"];
    return Array.from({ length: count }, (_, i) => {
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lon = bounds.minLon + Math.random() * (bounds.maxLon - bounds.minLon);
      const type = types[i % types.length];
      return {
        lat,
        lon,
        type,
        title: `${type.toUpperCase()} #${i + 1}`,
      };
    });
  };

  const initMap = (lat: number, lon: number): void => {
    const { mapBounds, mapWidth, mapHeight } = mapOptions;

    const lonToX = (lonVal: number): number =>
      ((lonVal - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * mapWidth;

    const latToY = (latVal: number): number =>
      ((mapBounds.maxLat - latVal) / (mapBounds.maxLat - mapBounds.minLat)) * mapHeight;

    const finalOptions: GenericMapConfig = {
      ...mapOptions,
      currentLocation: { lat, lon },
      markers: generateMarkers(mapBounds, mapOptions.markerCount),
      lonToX,
      latToY,
    };

    displayGenericMap(container, finalOptions);
  };

  initMap(mapOptions.defaultLocation.lat, mapOptions.defaultLocation.lon);

  return container;
}

export function displayGenericMap(container: HTMLElement, config: GenericMapConfig): void {
  if (!container) return;
  const el = createElement("div", { class: "generic-map" }, [
    createElement("p", {}, ["Generic map placeholder"])
  ]) as HTMLElement;
  container.appendChild(el);
}