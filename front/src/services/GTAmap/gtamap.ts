// gtaMap.ts

import { createElement } from "../../components/createElement.js";
import { Imagex } from "../../components/base/Imagex.js";
import { SRC_URL } from "../../api/api.js";
import { 
    smoothZoom, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd, 
    updateTransform, 
    resetTransformState 
} from "../../components/ui/zoomBox/zoomboxHelpers.js";
import { handlePointerDown, handlePointerMove, handlePointerUp } from "./pointerEvents.js";
import { fetchGtaMapData, fetchGtaMapDistance } from "./api.js";
import type { GtaMapState, GtaLocation, LiveEntity, Territory, CategoryItem } from "./gtamap.types";
import { createMapStructure } from "./gtamap.dom.js";

export async function displayGtaMap(container: HTMLElement, isLoggedIn: boolean, entity: string = "ls"): Promise<void> {
    container.innerHTML = "";

    const urlParams = new URLSearchParams(window.location.search);
    const initialMarker = urlParams.get("marker");
    const initialX = urlParams.get("x") ? parseFloat(urlParams.get("x")!) : null;
    const initialY = urlParams.get("y") ? parseFloat(urlParams.get("y")!) : null;
    const initialZoom = urlParams.get("zoom") ? parseFloat(urlParams.get("zoom")!) : 1;
    const initialFloor = urlParams.get("floor") ? parseInt(urlParams.get("floor")!, 10) : null;

    const state: GtaMapState = {
        zoomLevel: initialZoom,
        panX: 0,
        panY: 0,
        angle: 0,
        flip: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        velocityX: 0,
        velocityY: 0,
        currentIndex: 0,
        activeEntity: urlParams.get("entity") || entity,

        floors: [],
        currentFloor: initialFloor,

        locations: [],
        activeCategories: new Set(["all"]),
        liveEntities: new Map(),
        customWaypoint: null,
        activeMission: null,
        deliveryMissions: [],
        territories: [],
        liveEvents: [],

        isMeasuring: false,
        measurePoints: [],
        cursorCoords: { x: 0, y: 0 },
        timerIntervals: [],
        wsConnection: null,
        reconnectTimer: null
    };
    const dom = createMapStructure(container, state, {
        onEntityChange: async (val: string) => {
            state.activeEntity = val;
            state.currentFloor = null;
            resetTransformState(state);
            applyTransform();
            await loadMapData();
        },
        copyPermalink: () => copyPermalinkToClipboard(),
        toggleFullscreen: () => toggleFullscreen(),
        onMeasureToggle: () => {
            state.isMeasuring = !state.isMeasuring;
            state.measurePoints = [];
            renderMeasurementLayer();
        }
    });

    const {
        mapWrapper,
        floorSelectorBar,
        measureBtn,
        zoomInBtn,
        zoomOutBtn,
        zoomResetBtn,
        categoryFilterBar,
        svgTerritoryLayer,
        svgRouteLayer,
        svgMeasureLayer,
        markersOverlay,
        lockedAreasOverlay,
        detailsPanel,
        coordsOverlay,
        radarCanvas,
        mapImage,
        transformLayer,
        mapViewport
    } = dom;

    // Wire zoom controls now that DOM elements exist
    zoomInBtn.addEventListener("click", () => {
        smoothZoom({ deltaY: -1, clientX: mapViewport.clientWidth / 2, clientY: mapViewport.clientHeight / 2 } as WheelEvent, mapImage, state, mapViewport);
        applyTransform();
    });
    zoomOutBtn.addEventListener("click", () => {
        smoothZoom({ deltaY: 1, clientX: mapViewport.clientWidth / 2, clientY: mapViewport.clientHeight / 2 } as WheelEvent, mapImage, state, mapViewport);
        applyTransform();
    });
    zoomResetBtn.addEventListener("click", () => {
        resetTransformState(state);
        applyTransform();
    });

    // Ensure measure button UI updates to reflect state after toggle
    measureBtn.addEventListener("click", () => {
        measureBtn.classList.toggle("active", state.isMeasuring);
    });

    /* =========================================================
        Transform & Render Loop
        ========================================================= */

    function applyTransform(): void {
        updateTransform(transformLayer, state);
        const counterScale = Math.max(0.6, 1 / Math.sqrt(state.zoomLevel || 1));
        markersOverlay.style.setProperty("--gta-marker-scale", String(counterScale));
        updateRadarView();
    }

    function toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            mapWrapper.requestFullscreen().catch((err) => console.error(err));
        } else {
            document.exitFullscreen();
        }
    }

    /* =========================================================
        Multi-Floor & Interior Maps UI
        ========================================================= */

    function renderFloorSelector(): void {
        floorSelectorBar.innerHTML = "";
        if (!state.floors || state.floors.length === 0) {
            floorSelectorBar.classList.add("hidden");
            return;
        }

        floorSelectorBar.classList.remove("hidden");

        const mainBtn = createElement("button", {
            class: `gta-floor-btn ${state.currentFloor === null ? "active" : ""}`,
            events: { click: () => switchFloor(null) }
        }, ["Exterior"]);
        floorSelectorBar.appendChild(mainBtn);

        state.floors.forEach((f) => {
            const btn = createElement("button", {
                class: `gta-floor-btn ${state.currentFloor === f.level ? "active" : ""}`,
                events: { click: () => switchFloor(f.level) }
            }, [f.name || `Floor ${f.level}`]);
            floorSelectorBar.appendChild(btn);
        });
    }

    function switchFloor(floorLevel: number | null): void {
        state.currentFloor = floorLevel;
        renderFloorSelector();

        if (floorLevel === null) {
            mapImage.src = state.baseMapImageSrc || "";
        } else {
            const selectedFloor = state.floors.find((f) => f.level === floorLevel);
            if (selectedFloor && selectedFloor.image) {
                mapImage.src = selectedFloor.image;
            }
        }

        renderAllMarkers();
    }

    /* =========================================================
        Real-Time Tracking (WebSocket)
        ========================================================= */

    function initLiveTrackingWS(): void {
        if (state.wsConnection) {
            state.wsConnection.close();
        }
        if (state.reconnectTimer) {
            clearTimeout(state.reconnectTimer);
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/v1/gta/map/ws`;

        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "initial_state") {
                    state.liveEntities.clear();
                    (message.data || []).forEach((e: LiveEntity) => state.liveEntities.set(e.id, e));
                } else if (message.type === "entity_update" && message.data) {
                    state.liveEntities.set(message.data.id, message.data);
                }
                renderAllMarkers();
                updateRadarView();
            } catch (err) {
                console.error("Error parsing WebSocket entity track packet:", err);
            }
        };

        ws.onclose = () => {
            state.reconnectTimer = window.setTimeout(() => {
                if (document.body.contains(mapWrapper)) {
                    initLiveTrackingWS();
                }
            }, 5000);
        };

        state.wsConnection = ws;
    }

    /* =========================================================
        Deep-Linking & Permalinks
        ========================================================= */

    function copyPermalinkToClipboard(): void {
        const url = new URL(window.location.href);
        url.searchParams.set("entity", state.activeEntity);
        url.searchParams.set("zoom", state.zoomLevel.toFixed(1));
        url.searchParams.set("x", state.cursorCoords.x.toFixed(2));
        url.searchParams.set("y", state.cursorCoords.y.toFixed(2));

        if (state.currentFloor !== null) {
            url.searchParams.set("floor", String(state.currentFloor));
        } else {
            url.searchParams.delete("floor");
        }

        navigator.clipboard.writeText(url.toString()).then(() => {
            alert("Map permalink copied to clipboard!");
        });
    }

    function applyPermalinkFocus(permalink: any): void {
        if (!permalink) return;

        if (permalink.floorLevel !== undefined && permalink.floorLevel !== null) {
            switchFloor(permalink.floorLevel);
        }

        if (permalink.focusPoint && (permalink.focusPoint.x || permalink.focusPoint.y)) {
            focusOnCoordinate(permalink.focusPoint.x, permalink.focusPoint.y, permalink.zoom || 2);
        }
    }

    function focusOnCoordinate(xPct: number, yPct: number, targetZoom: number = 2): void {
        state.zoomLevel = targetZoom;
        const viewportWidth = mapViewport.clientWidth;
        const viewportHeight = mapViewport.clientHeight;

        state.panX = (viewportWidth / 2) - (xPct / 100 * viewportWidth * state.zoomLevel);
        state.panY = (viewportHeight / 2) - (yPct / 100 * viewportHeight * state.zoomLevel);

        applyTransform();
    }

    /* =========================================================
        Category Filtering System
        ========================================================= */

    function renderCategoryFilters(serverCategories?: CategoryItem[]): void {
        categoryFilterBar.innerHTML = "";
        const categories = serverCategories || [
            { id: "all", label: "All" },
            { id: "property", label: "🏢 Properties" },
            { id: "intel", label: "🔒 Intel" },
            { id: "live_event", label: "💀 Live Events" }
        ];

        categories.forEach((cat) => {
            const isActive = state.activeCategories.has(cat.id);
            const chip = createElement("button", {
                class: `gta-filter-chip ${isActive ? "active" : ""}`,
                events: {
                    click: () => {
                        if (cat.id === "all") {
                            state.activeCategories.clear();
                            state.activeCategories.add("all");
                        } else {
                            state.activeCategories.delete("all");
                            if (state.activeCategories.has(cat.id)) {
                                state.activeCategories.delete(cat.id);
                                if (state.activeCategories.size === 0) state.activeCategories.add("all");
                            } else {
                                state.activeCategories.add(cat.id);
                            }
                        }
                        renderCategoryFilters(serverCategories);
                        renderAllMarkers();
                    }
                }
            }, [`${cat.icon || ""} ${cat.label} ${cat.count !== undefined ? `(${cat.count})` : ""}`]);

            categoryFilterBar.appendChild(chip);
        });
    }

    /* =========================================================
        Minimap / Radar View
        ========================================================= */

    function updateRadarView(): void {
        const ctx = radarCanvas.getContext("2d");
        if (!ctx) return;

        const w = radarCanvas.width;
        const h = radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        const primaryPlayer = Array.from(state.liveEntities.values())[0] || {
            position: { x: 50, y: 50 },
            heading: 0
        };

        const px = primaryPlayer.position ? primaryPlayer.position.x : 50;
        const py = primaryPlayer.position ? primaryPlayer.position.y : 50;
        const heading = (primaryPlayer as LiveEntity).heading || 0;

        const mapScale = 3.5;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = "#0c1017";
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((-heading * Math.PI) / 180);

        if (mapImage && mapImage.complete && mapImage.naturalWidth !== 0) {
            const mapDrawWidth = w * mapScale;
            const mapDrawHeight = h * mapScale;

            const imgX = -(px / 100) * mapDrawWidth;
            const imgY = -(py / 100) * mapDrawHeight;

            ctx.drawImage(mapImage, imgX, imgY, mapDrawWidth, mapDrawHeight);
        }

        (state.locations || []).forEach((loc) => {
            if (state.currentFloor !== null && loc.floorLevel !== state.currentFloor) return;

            const mapDrawWidth = w * mapScale;
            const mapDrawHeight = h * mapScale;

            const relX = ((loc.x - px) / 100) * mapDrawWidth;
            const relY = ((loc.y - py) / 100) * mapDrawHeight;

            if (Math.hypot(relX, relY) < cx - 8) {
                ctx.fillStyle = "#3b82f6";
                ctx.beginPath();
                ctx.arc(relX, relY, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        state.liveEntities.forEach((entity) => {
            if (entity === primaryPlayer) return;

            const ex = entity.position ? entity.position.x : 50;
            const ey = entity.position ? entity.position.y : 50;

            const mapDrawWidth = w * mapScale;
            const mapDrawHeight = h * mapScale;

            const relX = ((ex - px) / 100) * mapDrawWidth;
            const relY = ((ey - py) / 100) * mapDrawHeight;

            if (Math.hypot(relX, relY) < cx - 8) {
                ctx.fillStyle = entity.type === "vehicle" ? "#eab308" : "#ef4444";
                ctx.beginPath();
                ctx.arc(relX, relY, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 7);
        ctx.lineTo(0, 4);
        ctx.lineTo(-6, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    /* =========================================================
        Measurement Tool Logic
        ========================================================= */

    async function renderMeasurementLayer(): Promise<void> {
        svgMeasureLayer.innerHTML = "";
        if (!state.isMeasuring || state.measurePoints.length === 0) return;

        const p1 = state.measurePoints[0];
        const p2 = state.measurePoints[1];

        if (!p1) return;

        const circle1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle1.setAttribute("cx", String(p1.x));
        circle1.setAttribute("cy", String(p1.y));
        circle1.setAttribute("r", "1.5");
        circle1.setAttribute("class", "gta-measure-node");
        svgMeasureLayer.appendChild(circle1);

        if (p2) {
            const circle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle2.setAttribute("cx", String(p2.x));
            circle2.setAttribute("cy", String(p2.y));
            circle2.setAttribute("r", "1.5");
            circle2.setAttribute("class", "gta-measure-node");
            svgMeasureLayer.appendChild(circle2);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", String(p1.x));
            line.setAttribute("y1", String(p1.y));
            line.setAttribute("x2", String(p2.x));
            line.setAttribute("y2", String(p2.y));
            line.setAttribute("class", "gta-measure-line");
            svgMeasureLayer.appendChild(line);

            try {
                const res: any = await fetchGtaMapDistance(p1.x, p1.y, p2.x, p2.y);
                const data = res?.data || res;

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", String((p1.x + p2.x) / 2));
                text.setAttribute("y", String((p1.y + p2.y) / 2 - 2));
                text.setAttribute("class", "gta-measure-text");
                text.textContent = `${data.distanceMeters}m (${data.estimatedTravel} travel)`;
                svgMeasureLayer.appendChild(text);
            } catch (err) {
                const fallbackDist = Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 50);
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", String((p1.x + p2.x) / 2));
                text.setAttribute("y", String((p1.y + p2.y) / 2 - 2));
                text.setAttribute("class", "gta-measure-text");
                text.textContent = `~${fallbackDist}m`;
                svgMeasureLayer.appendChild(text);
            }
        }
    }

    /* =========================================================
        Territory Heatmaps & Interactions
        ========================================================= */

    function renderTerritoryHeatmaps(territories: Territory[]): void {
        svgTerritoryLayer.innerHTML = "";
        (territories || []).forEach((t) => {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pointsString = (t.polygonPoints || t.points || []).map((p) => `${p.x},${p.y}`).join(" ");
            polygon.setAttribute("points", pointsString);
            polygon.setAttribute("fill", t.color || "rgba(239, 68, 68, 0.35)");
            polygon.setAttribute("stroke", "rgba(255, 255, 255, 0.6)");
            polygon.setAttribute("stroke-width", "0.5");
            polygon.setAttribute("class", "gta-territory-polygon");
            polygon.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();
                showTerritoryDetails(t);
            });
            svgTerritoryLayer.appendChild(polygon);
        });
    }

    function showTerritoryDetails(territory: Territory): void {
        detailsPanel.innerHTML = "";
        const closeBtn = createElement("button", {
            class: "gta-details-close",
            events: { click: () => detailsPanel.classList.add("hidden") }
        }, ["✕"]);
        const title = createElement("h4", { class: "gta-details-title" }, [`Turf: ${territory.gangName || territory.name}`]);
        const owner = createElement("p", { class: "gta-details-desc" }, [`Controlled by: ${territory.gangName || territory.owner}`]);
        const control = createElement("p", { class: "gta-details-desc" }, [`Control Level: ${territory.controlPct}%`]);
        detailsPanel.appendChild(closeBtn);
        detailsPanel.appendChild(title);
        detailsPanel.appendChild(owner);
        detailsPanel.appendChild(control);
        detailsPanel.classList.remove("hidden");
    }

    /* =========================================================
        Pointer & Touch Event Delegations
        ========================================================= */
    mapViewport.addEventListener("pointermove", (e: PointerEvent) => {
        const rect = transformLayer.getBoundingClientRect();
        const xPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const yPercent = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
        state.cursorCoords = { x: xPercent, y: yPercent };
        coordsOverlay.textContent = `X: ${xPercent.toFixed(2)} | Y: ${yPercent.toFixed(2)}`;

        if (state.isDragging) {
            handlePointerMove(e, state, transformLayer);
            applyTransform();
        }
    });

    mapViewport.addEventListener("pointerdown", (e: PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest(".gta-marker") || target.closest(".gta-locked-area")) return;

        if (state.isMeasuring) {
            if (state.measurePoints.length >= 2) state.measurePoints = [];
            state.measurePoints.push({ ...state.cursorCoords });
            renderMeasurementLayer();
            return;
        }

        handlePointerDown(e, state, transformLayer);
    });

    mapViewport.addEventListener("pointerup", (e: PointerEvent) => {
        if (state.isDragging) {
            handlePointerUp(e, state, transformLayer);
        }
    });

    mapViewport.addEventListener("pointercancel", (e: PointerEvent) => {
        if (state.isDragging) {
            handlePointerUp(e, state, transformLayer);
        }
    });

    mapViewport.addEventListener("touchstart", (e: TouchEvent) => handleTouchStart(e, state, transformLayer), { passive: false });
    mapViewport.addEventListener("touchmove", (e: TouchEvent) => {
        handleTouchMove(e, state, transformLayer);
        applyTransform();
    }, { passive: false });
    mapViewport.addEventListener("touchend", (e: TouchEvent) => handleTouchEnd(e, state));

    mapViewport.addEventListener("wheel", (e: WheelEvent) => {
        e.preventDefault();
        smoothZoom(e, mapImage, state, mapViewport);
        applyTransform();
    }, { passive: false });

    mapViewport.addEventListener("dblclick", (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest(".gta-marker") || state.isMeasuring) return;
        state.customWaypoint = { x: state.cursorCoords.x, y: state.cursorCoords.y };
        renderAllMarkers();
        renderRoutePaths();
    });

    /* =========================================================
        Marker & Tracking Rendering
        ========================================================= */

    function renderAllMarkers(): void {
        markersOverlay.innerHTML = "";
        const filteredLocations = (state.locations || []).filter((loc) => {
            if (state.currentFloor !== null) {
                if (loc.floorLevel !== state.currentFloor) return false;
            } else {
                if (loc.floorLevel !== undefined && loc.floorLevel !== null) return false;
            }
            if (state.activeCategories.has("all")) return true;
            return state.activeCategories.has(loc.category);
        });

        filteredLocations.forEach(renderSingleMarker);

        state.liveEntities.forEach((entity) => {
            if (state.currentFloor !== null && entity.floor !== state.currentFloor) return;
            if (state.currentFloor === null && entity.floor && entity.floor !== 0) return;
            const entityIcon = entity.type === "vehicle" ? "🚗" : "👤";
            const liveMarker = createElement("div", {
                class: `gta-marker gta-marker-live gta-marker-${entity.type || "player"}`,
                style: {
                    left: `${entity.position.x}%`,
                    top: `${entity.position.y}%`,
                    transform: `translate(-50%, -50%) rotate(${entity.heading || 0}deg)`
                }
            }, [
                createElement("span", { class: "gta-marker-icon" }, [entityIcon]),
                createElement("span", { class: "gta-marker-label" }, [`${entity.name} (${entity.speed} km/h)`])
            ]);
            markersOverlay.appendChild(liveMarker);
        });

        if (state.customWaypoint) {
            const waypointEl = createElement("div", {
                class: "gta-marker gta-marker-waypoint",
                style: { left: `${state.customWaypoint.x}%`, top: `${state.customWaypoint.y}%` },
                events: {
                    click: (e: Event) => {
                        e.stopPropagation();
                        state.customWaypoint = null;
                        renderAllMarkers();
                        renderRoutePaths();
                    }
                }
            }, [
                createElement("span", { class: "gta-marker-icon" }, ["🈁"]),
                createElement("span", { class: "gta-marker-label" }, ["Waypoint"])
            ]);
            markersOverlay.appendChild(waypointEl);
        }
    }

    function renderSingleMarker(loc: GtaLocation): void {
        const iconElement = loc.iconUrl
            ? Imagex({ src: loc.iconUrl, fallback: "/assets/icon-192.png", class: "gta-marker-img-icon", alt: loc.name })
            : createElement("span", { class: "gta-marker-icon" }, [loc.icon || "📍"]);
        const marker = createElement("div", {
            class: `gta-marker gta-marker-${loc.category || "default"}`,
            style: { left: `${loc.x}%`, top: `${loc.y}%` },
            events: {
                click: (e: Event) => {
                    e.stopPropagation();
                    showLocationDetails(loc);
                }
            }
        }, [
            iconElement,
            createElement("span", { class: "gta-marker-label" }, [loc.name])
        ]);
        if (loc.liveEvent && loc.liveEvent.isLive) {
            const badge = createElement("span", { class: "gta-event-badge" }, [`${loc.liveEvent.remainingSecs}s`]);
            marker.appendChild(badge);
        }
        markersOverlay.appendChild(marker);
    }

    function renderRoutePaths(): void {
        svgRouteLayer.innerHTML = "";
        if (!state.activeMission) return;
        const { from, to } = state.activeMission;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 10}, ${to.x} ${to.y}`;
        path.setAttribute("d", d);
        path.setAttribute("class", "gta-route-line gta-route-animated");
        svgRouteLayer.appendChild(path);
    }

    function showLocationDetails(loc: GtaLocation): void {
        detailsPanel.innerHTML = "";
        const closeBtn = createElement("button", {
            class: "gta-details-close",
            events: { click: () => detailsPanel.classList.add("hidden") }
        }, ["✕"]);
        const title = createElement("h4", { class: "gta-details-title" }, [loc.name]);
        const desc = createElement("p", { class: "gta-details-desc" }, [loc.description || "No description available."]);
        detailsPanel.appendChild(closeBtn);
        detailsPanel.appendChild(title);
        detailsPanel.appendChild(desc);
        if (loc.details) {
            if (loc.details.address) {
                detailsPanel.appendChild(createElement("p", { class: "gta-details-info" }, [`Address: ${loc.details.address}`]));
            }
            if (loc.details.price) {
                detailsPanel.appendChild(createElement("p", { class: "gta-details-info" }, [`Price: $${loc.details.price.toLocaleString()}`]));
            }
        }

        detailsPanel.classList.remove("hidden");
    }

    /* =========================================================
        API Data Fetching & Initialization
        ========================================================= */

    async function loadMapData(): Promise<void> {
        try {
            markersOverlay.innerHTML = "";
            lockedAreasOverlay.innerHTML = "";
            svgRouteLayer.innerHTML = "";
            detailsPanel.classList.add("hidden");

            const response: any = await fetchGtaMapData(
                state.activeEntity,
                isLoggedIn,
                initialMarker,
                initialX,
                initialY
            );
            const mapData = response?.data || response;

            state.locations = mapData?.locations || [];
            state.territories = mapData?.territories || [];
            state.floors = mapData?.floors || [];
            state.baseMapImageSrc = mapData?.map?.image || `${SRC_URL || ""}/assets/maps/${state.activeEntity}_map.png`;

            mapImage.src = state.baseMapImageSrc || "";

            renderCategoryFilters(mapData?.categories);
            renderFloorSelector();
            renderTerritoryHeatmaps(state.territories);
            renderAllMarkers();

            if (mapData?.permalink) {
                applyPermalinkFocus(mapData.permalink);
            }
        } catch (err) {
            console.error("Failed to load map data:", err);
        }
    }

    // Initialize Map and Realtime Connections
    await loadMapData();
    initLiveTrackingWS();
    applyTransform();
}