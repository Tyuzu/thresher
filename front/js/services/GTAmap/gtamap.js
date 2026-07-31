import { createElement } from "../../components/createElement.js";
import { Imagex } from "../../components/base/Imagex.js";
import { apiFetch, SRC_URL } from "../../api/api.js";
import {
    smoothZoom,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    updateTransform,
    resetTransformState
} from "../../components/ui/zoomboxHelpers.js";

export async function displayGtaMap(container, isLoggedIn, entity = "ls") {
    container.innerHTML = "";

    // Parse URL query parameters for permalink / deep-link support
    const urlParams = new URLSearchParams(window.location.search);
    const initialMarker = urlParams.get("marker");
    const initialX = urlParams.get("x") ? parseFloat(urlParams.get("x")) : null;
    const initialY = urlParams.get("y") ? parseFloat(urlParams.get("y")) : null;
    const initialZoom = urlParams.get("zoom") ? parseFloat(urlParams.get("zoom")) : 1;
    const initialFloor = urlParams.get("floor") ? parseInt(urlParams.get("floor"), 10) : null;

    const state = {
        zoomLevel: initialZoom,
        panX: 0,
        panY: 0,
        angle: 0,
        flip: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        activeEntity: urlParams.get("entity") || entity,

        // Floor / Interior Layer State
        floors: [],
        currentFloor: initialFloor, // null = exterior map, integer = floor level

        // Map Data & Category State
        locations: [],
        activeCategories: new Set(["all"]),
        liveEntities: new Map(), // Real-time tracked entities (players, vehicles)
        customWaypoint: null,
        activeMission: null,
        deliveryMissions: [],
        territories: [],
        liveEvents: [],

        // Feature States
        isMeasuring: false,
        measurePoints: [],
        cursorCoords: { x: 0, y: 0 },
        timerIntervals: [],
        wsConnection: null
    };

    /* =========================================================
       UI Shell & Layout Setup
       ========================================================= */

    const mapWrapper = createElement("div", { class: "gta-map-wrapper" });

    // Entity Dropdown
    const entitySelector = createElement("select", {
        class: "gta-map-selector",
        events: {
            change: async (e) => {
                state.activeEntity = e.target.value;
                state.currentFloor = null;
                resetTransformState(state);
                applyTransform();
                await loadMapData();
            }
        }
    }, [
        createElement("option", { value: "ls", selected: state.activeEntity === "ls" }, ["Los Santos"]),
        createElement("option", { value: "cp", selected: state.activeEntity === "cp" }, ["Cayo Perico"]),
        createElement("option", { value: "sa", selected: state.activeEntity === "sa" }, ["San Andreas"])
    ]);

    // Floor Selector Container
    const floorSelectorBar = createElement("div", { class: "gta-floor-selector hidden" });

    // Share / Permalink Button
    const shareBtn = createElement("button", {
        class: "gta-btn-share",
        events: {
            click: () => copyPermalinkToClipboard()
        }
    }, ["🔗 Share Link"]);

    // Zoom & Screen Controls
    const fullScreenBtn = createElement("button", {
        class: "gta-btn-fullscreen",
        events: { click: () => toggleFullscreen() }
    }, ["⛶"]);

    const measureBtn = createElement("button", {
        class: "gta-btn-measure",
        events: {
            click: () => {
                state.isMeasuring = !state.isMeasuring;
                state.measurePoints = [];
                measureBtn.classList.toggle("active", state.isMeasuring);
                renderMeasurementLayer();
            }
        }
    }, ["📏 Ruler"]);

    const zoomControls = createElement("div", { class: "gta-zoom-controls" }, [
        shareBtn,
        measureBtn,
        fullScreenBtn,
        createElement("button", {
            class: "gta-btn-zoom-in",
            events: {
                click: () => {
                    smoothZoom({ deltaY: -1, clientX: mapViewport.clientWidth / 2, clientY: mapViewport.clientHeight / 2 }, transformLayer, state, mapViewport);
                    applyTransform();
                }
            }
        }, ["+"]),
        createElement("button", {
            class: "gta-btn-zoom-out",
            events: {
                click: () => {
                    smoothZoom({ deltaY: 1, clientX: mapViewport.clientWidth / 2, clientY: mapViewport.clientHeight / 2 }, transformLayer, state, mapViewport);
                    applyTransform();
                }
            }
        }, ["−"]),
        createElement("button", {
            class: "gta-btn-zoom-reset",
            events: {
                click: () => {
                    resetTransformState(state);
                    applyTransform();
                }
            }
        }, ["Reset"])
    ]);

    // Category Filter Bar
    const categoryFilterBar = createElement("div", { class: "gta-category-filters" });

    const mapHeader = createElement("div", { class: "gta-map-header" }, [
        createElement("h3", { class: "gta-map-title" }, ["GTA Map Explorer"]),
        categoryFilterBar,
        createElement("div", { class: "gta-map-header-actions" }, [entitySelector, zoomControls])
    ]);

    // Overlays & Layers
    const svgTerritoryLayer = createElement("svg", { class: "gta-map-territories-svg" });
    const svgRouteLayer = createElement("svg", { class: "gta-map-routes-svg" });
    const svgMeasureLayer = createElement("svg", { class: "gta-map-measure-svg" });
    const markersOverlay = createElement("div", { class: "gta-map-markers" });
    const lockedAreasOverlay = createElement("div", { class: "gta-map-locked-areas" });
    const detailsPanel = createElement("div", { class: "gta-map-details hidden" });
    const missionHudPanel = createElement("div", { class: "gta-mission-hud hidden" });

    // Coordinate Overlay Badge
    const coordsOverlay = createElement("div", { class: "gta-coords-overlay" }, ["X: 0.00 | Y: 0.00"]);

    // Minimap / Radar Container
    const radarContainer = createElement("div", { class: "gta-radar-container" });
    const radarCanvas = createElement("canvas", { class: "gta-radar-canvas", width: "150", height: "150" });
    radarContainer.appendChild(radarCanvas);

    let mapImage = Imagex({
        src: "",
        fallback: "/assets/maps/loc/fallback_map.png",
        class: "gta-map-image",
        alt: "GTA Map",
        draggable: false
    });

    const transformLayer = createElement("div", { class: "gta-map-transform-layer" }, [
        mapImage,
        svgTerritoryLayer,
        lockedAreasOverlay,
        svgRouteLayer,
        svgMeasureLayer,
        markersOverlay
    ]);

    const mapViewport = createElement("div", { class: "gta-map-viewport" }, [
        transformLayer,
        floorSelectorBar,
        missionHudPanel,
        coordsOverlay,
        radarContainer
    ]);

    mapWrapper.appendChild(mapHeader);
    mapWrapper.appendChild(mapViewport);
    mapWrapper.appendChild(detailsPanel);
    container.appendChild(mapWrapper);

    /* =========================================================
       Transform & Render Loop
       ========================================================= */

    function applyTransform() {
        updateTransform(transformLayer, state);
        const counterScale = Math.max(0.6, 1 / Math.sqrt(state.zoomLevel || 1));
        markersOverlay.style.setProperty("--gta-marker-scale", counterScale);
        updateRadarView();
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            mapWrapper.requestFullscreen().catch((err) => console.error(err));
        } else {
            document.exitFullscreen();
        }
    }

    /* =========================================================
       Feature 1: Multi-Floor & Interior Maps UI
       ========================================================= */

    function renderFloorSelector() {
        floorSelectorBar.innerHTML = "";
        if (!state.floors || state.floors.length === 0) {
            floorSelectorBar.classList.add("hidden");
            return;
        }

        floorSelectorBar.classList.remove("hidden");

        // Ground/Main exterior option
        const mainBtn = createElement("button", {
            class: `gta-floor-btn ${state.currentFloor === null ? "active" : ""}`,
            events: {
                click: () => switchFloor(null)
            }
        }, ["Exterior"]);
        floorSelectorBar.appendChild(mainBtn);

        state.floors.forEach((f) => {
            const btn = createElement("button", {
                class: `gta-floor-btn ${state.currentFloor === f.level ? "active" : ""}`,
                events: {
                    click: () => switchFloor(f.level)
                }
            }, [f.name || `Floor ${f.level}`]);
            floorSelectorBar.appendChild(btn);
        });
    }

    function switchFloor(floorLevel) {
        state.currentFloor = floorLevel;
        renderFloorSelector();

        if (floorLevel === null) {
            // Restore default entity map
            mapImage.src = state.baseMapImageSrc;
        } else {
            const selectedFloor = state.floors.find((f) => f.level === floorLevel);
            if (selectedFloor && selectedFloor.image) {
                mapImage.src = selectedFloor.image;
            }
        }

        renderAllMarkers();
    }

    /* =========================================================
       Feature 2: Real-Time Player & Vehicle Tracking (WebSocket)
       ========================================================= */

    function initLiveTrackingWS() {
        if (state.wsConnection) {
            state.wsConnection.close();
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/v1/gta/map/ws`;

        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "initial_state") {
                    state.liveEntities.clear();
                    (message.data || []).forEach((e) => state.liveEntities.set(e.id, e));
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
            // Auto-reconnect after 5 seconds if connection drops
            setTimeout(() => {
                if (document.body.contains(mapWrapper)) {
                    initLiveTrackingWS();
                }
            }, 5000);
        };

        state.wsConnection = ws;
    }

    /* =========================================================
       Feature 3: Deep-Linking & Permalinks
       ========================================================= */

    function copyPermalinkToClipboard() {
        const url = new URL(window.location.href);
        url.searchParams.set("entity", state.activeEntity);
        url.searchParams.set("zoom", state.zoomLevel.toFixed(1));
        url.searchParams.set("x", state.cursorCoords.x.toFixed(2));
        url.searchParams.set("y", state.cursorCoords.y.toFixed(2));

        if (state.currentFloor !== null) {
            url.searchParams.set("floor", state.currentFloor);
        } else {
            url.searchParams.delete("floor");
        }

        navigator.clipboard.writeText(url.toString()).then(() => {
            alert("Map permalink copied to clipboard!");
        });
    }

    function applyPermalinkFocus(permalink) {
        if (!permalink) return;

        if (permalink.floorLevel !== undefined && permalink.floorLevel !== null) {
            switchFloor(permalink.floorLevel);
        }

        if (permalink.focusPoint && (permalink.focusPoint.x || permalink.focusPoint.y)) {
            focusOnCoordinate(permalink.focusPoint.x, permalink.focusPoint.y, permalink.zoom || 2);
        }
    }

    function focusOnCoordinate(xPct, yPct, targetZoom = 2) {
        state.zoomLevel = targetZoom;
        const viewportWidth = mapViewport.clientWidth;
        const viewportHeight = mapViewport.clientHeight;

        state.panX = (viewportWidth / 2) - (xPct / 100 * viewportWidth * state.zoomLevel);
        state.panY = (viewportHeight / 2) - (yPct / 100 * viewportHeight * state.zoomLevel);

        applyTransform();
    }

    /* =========================================================
       Feature 4: Category Filtering System
       ========================================================= */

    function renderCategoryFilters(serverCategories) {
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
       Feature 5: Minimap / Radar View
       ========================================================= */

    function updateRadarView() {
        const ctx = radarCanvas.getContext("2d");
        const w = radarCanvas.width;
        const h = radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = "#0c1017";
        ctx.fillRect(0, 0, w, h);

        // Radar Sweep Ring Overlays
        ctx.strokeStyle = "rgba(34, 197, 94, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.stroke();

        // Find primary active player for radar center
        let primaryPlayer = Array.from(state.liveEntities.values())[0] || { position: { x: 50, y: 50 }, heading: 0 };
        const px = primaryPlayer.position ? primaryPlayer.position.x : 50;
        const py = primaryPlayer.position ? primaryPlayer.position.y : 50;

        // Render nearby location markers on radar
        (state.locations || []).forEach((loc) => {
            const dx = (loc.x - px) * 2.5;
            const dy = (loc.y - py) * 2.5;
            const dist = Math.hypot(dx, dy);

            if (dist < cx - 5) {
                ctx.fillStyle = "#3b82f6";
                ctx.beginPath();
                ctx.arc(cx + dx, cy + dy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Render live tracked entities on radar
        state.liveEntities.forEach((entity) => {
            const ex = entity.position ? entity.position.x : 50;
            const ey = entity.position ? entity.position.y : 50;
            const dx = (ex - px) * 2.5;
            const dy = (ey - py) * 2.5;
            const dist = Math.hypot(dx, dy);

            if (dist < cx - 5) {
                ctx.fillStyle = entity.type === "vehicle" ? "#eab308" : "#22c55e";
                ctx.beginPath();
                ctx.arc(cx + dx, cy + dy, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Center Arrow
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((primaryPlayer.heading || 0) * Math.PI) / 180);
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 7);
        ctx.lineTo(0, 4);
        ctx.lineTo(-5, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    /* =========================================================
       Feature 6: Measurement Tool Logic
       ========================================================= */

    async function renderMeasurementLayer() {
        svgMeasureLayer.innerHTML = "";
        if (!state.isMeasuring || state.measurePoints.length === 0) return;

        const [p1, p2] = state.measurePoints;

        const circle1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle1.setAttribute("cx", `${p1.x}%`);
        circle1.setAttribute("cy", `${p1.y}%`);
        circle1.setAttribute("r", "5");
        circle1.setAttribute("class", "gta-measure-node");
        svgMeasureLayer.appendChild(circle1);

        if (p2) {
            const circle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle2.setAttribute("cx", `${p2.x}%`);
            circle2.setAttribute("cy", `${p2.y}%`);
            circle2.setAttribute("r", "5");
            circle2.setAttribute("class", "gta-measure-node");
            svgMeasureLayer.appendChild(circle2);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", `${p1.x}%`);
            line.setAttribute("y1", `${p1.y}%`);
            line.setAttribute("x2", `${p2.x}%`);
            line.setAttribute("y2", `${p2.y}%`);
            line.setAttribute("class", "gta-measure-line");
            svgMeasureLayer.appendChild(line);

            // Fetch precise distance calculation from backend API
            try {
                const res = await apiFetch(`/gta/map/distance?x1=${p1.x}&y1=${p1.y}&x2=${p2.x}&y2=${p2.y}`);
                const data = res?.data || res;

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", `${(p1.x + p2.x) / 2}%`);
                text.setAttribute("y", `${(p1.y + p2.y) / 2 - 2}%`);
                text.setAttribute("class", "gta-measure-text");
                text.textContent = `${data.distanceMeters}m (${data.estimatedTravel} travel)`;
                svgMeasureLayer.appendChild(text);
            } catch (err) {
                const fallbackDist = Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 50);
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", `${(p1.x + p2.x) / 2}%`);
                text.setAttribute("y", `${(p1.y + p2.y) / 2 - 2}%`);
                text.setAttribute("class", "gta-measure-text");
                text.textContent = `~${fallbackDist}m`;
                svgMeasureLayer.appendChild(text);
            }
        }
    }

    /* =========================================================
       Feature 7: Territory Heatmaps & Interactions
       ========================================================= */

    function renderTerritoryHeatmaps(territories) {
        svgTerritoryLayer.innerHTML = "";
        (territories || []).forEach((t) => {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pointsString = (t.polygonPoints || t.points || []).map((p) => `${p.x},${p.y}`).join(" ");

            polygon.setAttribute("points", pointsString);
            polygon.setAttribute("fill", t.color || "rgba(239, 68, 68, 0.35)");
            polygon.setAttribute("stroke", "rgba(255, 255, 255, 0.6)");
            polygon.setAttribute("stroke-width", "1.5");
            polygon.setAttribute("class", "gta-territory-polygon");

            polygon.addEventListener("click", (e) => {
                e.stopPropagation();
                showTerritoryDetails(t);
            });

            svgTerritoryLayer.appendChild(polygon);
        });
    }

    function showTerritoryDetails(territory) {
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
       Feature 8: Mouse Coordinate Tracking & Event Delegation
       ========================================================= */

    mapViewport.addEventListener("mousemove", (e) => {
        const rect = transformLayer.getBoundingClientRect();
        const xPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const yPercent = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

        state.cursorCoords = { x: xPercent, y: yPercent };
        coordsOverlay.textContent = `X: ${xPercent.toFixed(2)} | Y: ${yPercent.toFixed(2)}`;
    });

    mapViewport.addEventListener("mousedown", (e) => {
        if (e.target.closest(".gta-marker") || e.target.closest(".gta-locked-area")) return;

        if (state.isMeasuring) {
            if (state.measurePoints.length >= 2) state.measurePoints = [];
            state.measurePoints.push({ ...state.cursorCoords });
            renderMeasurementLayer();
            return;
        }

        handleMouseDown(e, state, transformLayer);
    });

    mapViewport.addEventListener("touchstart", (e) => handleTouchStart(e, state, transformLayer), { passive: false });
    mapViewport.addEventListener("touchmove", (e) => {
        handleTouchMove(e, state, transformLayer);
        applyTransform();
    }, { passive: false });
    mapViewport.addEventListener("touchend", (e) => handleTouchEnd(e, state));

    mapViewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        smoothZoom(e, transformLayer, state, mapViewport);
        applyTransform();
    }, { passive: false });

    mapViewport.addEventListener("dblclick", (e) => {
        if (e.target.closest(".gta-marker") || state.isMeasuring) return;

        state.customWaypoint = { x: state.cursorCoords.x, y: state.cursorCoords.y };
        renderAllMarkers();
        renderRoutePaths();
    });

    /* =========================================================
       Marker & Tracking Rendering
       ========================================================= */

    function renderAllMarkers() {
        markersOverlay.innerHTML = "";

        // 1. Filter Location Markers based on active categories and current interior floor
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

        // 2. Render WebSocket Tracked Live Entities (Players/Vehicles)
        state.liveEntities.forEach((entity) => {
            // Check if entity is on current floor
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

        // 3. Custom Waypoint
        if (state.customWaypoint) {
            const waypointEl = createElement("div", {
                class: "gta-marker gta-marker-waypoint",
                style: { left: `${state.customWaypoint.x}%`, top: `${state.customWaypoint.y}%` },
                events: {
                    click: (e) => {
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

    function renderSingleMarker(loc) {
        const iconElement = loc.iconUrl
            ? Imagex({ src: loc.iconUrl, fallback: "/assets/icon-192.png", class: "gta-marker-img-icon", alt: loc.name })
            : createElement("span", { class: "gta-marker-icon" }, [loc.icon || "📍"]);

        const marker = createElement("div", {
            class: `gta-marker gta-marker-${loc.category || "default"}`,
            style: { left: `${loc.x}%`, top: `${loc.y}%` },
            events: {
                click: (e) => {
                    e.stopPropagation();
                    showLocationDetails(loc);
                }
            }
        }, [
            iconElement,
            createElement("span", { class: "gta-marker-label" }, [loc.name])
        ]);

        // Live Event Badge attachment
        if (loc.liveEvent && loc.liveEvent.isLive) {
            const badge = createElement("span", { class: "gta-event-badge" }, [`${loc.liveEvent.remainingSecs}s`]);
            marker.appendChild(badge);
        }

        markersOverlay.appendChild(marker);
    }

    function renderRoutePaths() {
        svgRouteLayer.innerHTML = "";
        if (!state.activeMission) return;

        const { from, to } = state.activeMission;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = `M ${from.x}% ${from.y}% Q ${(from.x + to.x) / 2}% ${(from.y + to.y) / 2 - 10}, ${to.x}% ${to.y}%`;

        path.setAttribute("d", d);
        path.setAttribute("class", "gta-route-line gta-route-animated");
        svgRouteLayer.appendChild(path);
    }

    function showLocationDetails(loc) {
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

    async function loadMapData() {
        try {
            markersOverlay.innerHTML = "";
            lockedAreasOverlay.innerHTML = "";
            svgRouteLayer.innerHTML = "";
            detailsPanel.classList.add("hidden");

            // Build query params including initial URL flags
            let endpoint = `/gta/map?entity=${state.activeEntity}&auth=${isLoggedIn}`;
            if (initialMarker) endpoint += `&marker=${initialMarker}`;
            if (initialX !== null && initialY !== null) endpoint += `&x=${initialX}&y=${initialY}`;

            const response = await apiFetch(endpoint);
            const mapData = response?.data || response;

            state.locations = mapData?.locations || [];
            state.territories = mapData?.territories || [];
            state.floors = mapData?.floors || [];
            state.baseMapImageSrc = mapData?.map?.image || `${SRC_URL || ""}/assets/maps/loc/${state.activeEntity}_map.jpg`;

            renderCategoryFilters(mapData?.categories);
            renderFloorSelector();

            const newMapImage = Imagex({
                src: state.baseMapImageSrc,
                fallback: mapData?.map?.fallbackImage || "/assets/maps/loc/fallback_map.png",
                class: "gta-map-image",
                alt: mapData?.title || "GTA Map",
                draggable: false
            });

            transformLayer.replaceChild(newMapImage, mapImage);
            mapImage = newMapImage;

            renderTerritoryHeatmaps(state.territories);
            renderAllMarkers();
            renderRoutePaths();

            // Handle Permalinks / Focus Points
            if (mapData?.permalink) {
                applyPermalinkFocus(mapData.permalink);
            } else {
                applyTransform();
            }

            // Start WebSocket Live Tracking
            initLiveTrackingWS();

        } catch (err) {
            console.error("Failed to load map data:", err);
            markersOverlay.innerHTML = `<div class="gta-map-error">Error fetching map features.</div>`;
        }
    }

    await loadMapData();
}