import { displayDynamicMap } from "../maps/genericMap.js";

// --- Type Definitions / Interfaces ---

export interface MapBounds {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

export interface MapMarker {
    lat: number;
    lon: number;
    type: "event" | "shop" | string;
    name: string;
}

export interface LockedArea {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    dependsOn: string;
}

export interface MapOptions {
    mapImage: string;
    mapWidth: number;
    mapHeight: number;
    mapBounds: MapBounds;
    currentLocation: { lat: number; lon: number };
    markers: MapMarker[];
    showLegend: boolean;
    lockedAreas?: LockedArea[];
}

// --- DOM Element Reference with Null Check ---

const container = document.getElementById("map-root") as HTMLElement | null;

if (!container) {
    console.error("Map container element with ID 'map-root' not found.");
}

// --- Helper Functions ---

// Define map bounds (approximate area)
const mapBounds: MapBounds = {
    minLat: 37.700,  // South
    maxLat: 37.830,  // North
    minLon: -122.520, // West
    maxLon: -122.350, // East
};

// Simulate API or generated events
function generateNearbyEvents(userLat: number, userLon: number): MapMarker[] {
    const events: MapMarker[] = [];
    for (let i = 0; i < 6; i++) {
        const offsetLat = (Math.random() - 0.5) * 0.02; // within ~2 km
        const offsetLon = (Math.random() - 0.5) * 0.02;
        events.push({
            lat: userLat + offsetLat,
            lon: userLon + offsetLon,
            type: i % 2 === 0 ? "event" : "shop",
            name: i % 2 === 0 ? `Live Event #${i + 1}` : `Shop #${i + 1}`,
        });
    }
    return events;
}

// --- Geolocation & Rendering Logic ---

if (navigator.geolocation && container) {
    // Get current location and render map
    navigator.geolocation.getCurrentPosition(
        (pos: GeolocationPosition) => {
            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;

            const events = generateNearbyEvents(userLat, userLon);

            const mapConfig: MapOptions = {
                mapImage: "/assets/city-map.jpg",
                mapWidth: 1200,
                mapHeight: 800,
                mapBounds,
                currentLocation: { lat: userLat, lon: userLon },
                markers: events,
                showLegend: true,
                lockedAreas: [
                    { x: 500, y: 100, width: 150, height: 120, label: "VIP Zone", dependsOn: "access-pass" },
                ],
            };

            displayDynamicMap(container, mapConfig);
        },
        (err: GeolocationPositionError) => {
            console.error("Geolocation failed:", err);
            
            if (!container) return;

            // fallback: use static coordinates
            const fallbackLat = 37.7749;
            const fallbackLon = -122.4194;

            const events = generateNearbyEvents(fallbackLat, fallbackLon);

            const fallbackConfig: MapOptions = {
                mapImage: "/assets/city-map.jpg",
                mapWidth: 1200,
                mapHeight: 800,
                mapBounds,
                currentLocation: { lat: fallbackLat, lon: fallbackLon },
                markers: events,
                showLegend: true,
            };

            displayDynamicMap(container, fallbackConfig);
        }
    );
}