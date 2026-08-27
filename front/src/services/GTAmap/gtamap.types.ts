export interface GtaFloor {
    level: number;
    name?: string;
    image?: string;
}

export interface GtaLocation {
    id?: string;
    name: string;
    description?: string;
    category: string;
    x: number;
    y: number;
    floorLevel?: number;
    icon?: string;
    iconUrl?: string;
    details?: {
        address?: string;
        price?: number;
    };
    liveEvent?: {
        isLive: boolean;
        remainingSecs: number;
    };
}

export interface LiveEntity {
    id: string;
    type: "vehicle" | "player" | string;
    name: string;
    speed: number;
    heading: number;
    floor?: number;
    position: {
        x: number;
        y: number;
    };
}

export interface TerritoryPoint {
    x: number;
    y: number;
}

export interface Territory {
    id?: string;
    name: string;
    gangName?: string;
    owner?: string;
    controlPct: number;
    color?: string;
    polygonPoints?: TerritoryPoint[];
    points?: TerritoryPoint[];
}

export interface CategoryItem {
    id: string;
    label: string;
    icon?: string;
    count?: number;
}

export interface GtaMapState {
    zoomLevel: number;
    panX: number;
    panY: number;
    angle: number;
    flip: boolean;
    isDragging: boolean;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    currentIndex: number;
    activeEntity: string;

    floors: GtaFloor[];
    currentFloor: number | null;

    locations: GtaLocation[];
    activeCategories: Set<string>;
    liveEntities: Map<string, LiveEntity>;
    customWaypoint: TerritoryPoint | null;
    activeMission: { from: TerritoryPoint; to: TerritoryPoint } | null;
    deliveryMissions: any[];
    territories: Territory[];
    liveEvents: any[];

    isMeasuring: boolean;
    measurePoints: TerritoryPoint[];
    cursorCoords: TerritoryPoint;
    timerIntervals: number[];
    wsConnection: WebSocket | null;
    reconnectTimer: number | null;
    baseMapImageSrc?: string;
}
