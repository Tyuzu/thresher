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
    resetTransformState,
    showZoomIndicator
} from "../../components/ui/zoomboxHelpers.js";

/**
 * Enhanced Interactive GTA Map with delivery missions, routes, custom waypoints, and player tracking.
 * Refactored using ZoomBox helpers.
 */
export async function displayGtaMap(container, isLoggedIn, entity = "ls") {
    container.innerHTML = "";

    // Unified state compatible with ZoomBox helper functions
    const state = {
        zoomLevel: 1,
        panX: 0,
        panY: 0,
        angle: 0,
        flip: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        activeEntity: entity,

        // GTA Features State
        playerPos: { x: 50, y: 50 }, // Center default
        customWaypoint: null,
        activeMission: null,
        deliveryMissions: []
    };

    // UI Construction
    const mapWrapper = createElement("div", { class: "gta-map-wrapper" });

    const entitySelector = createElement("select", {
        class: "gta-map-selector",
        events: {
            change: async (e) => {
                state.activeEntity = e.target.value;
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

    const zoomControls = createElement("div", { class: "gta-zoom-controls" }, [
        createElement("button", {
            class: "gta-btn-zoom-in",
            events: {
                click: () => {
                    smoothZoom({
                        deltaY: -1,
                        clientX: mapViewport.clientWidth / 2,
                        clientY: mapViewport.clientHeight / 2
                    }, mapImage, state, mapViewport);
                    applyTransform();
                }
            }
        }, ["+"]),
        createElement("button", {
            class: "gta-btn-zoom-out",
            events: {
                click: () => {
                    smoothZoom({
                        deltaY: 1,
                        clientX: mapViewport.clientWidth / 2,
                        clientY: mapViewport.clientHeight / 2
                    }, mapImage, state, mapViewport);
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

    const mapHeader = createElement("div", { class: "gta-map-header" }, [
        createElement("h3", { class: "gta-map-title" }, ["GTA Map Explorer"]),
        createElement("div", { class: "gta-map-header-actions" }, [entitySelector, zoomControls])
    ]);

    // Overlays
    const svgRouteLayer = createElement("svg", { class: "gta-map-routes-svg" });
    const markersOverlay = createElement("div", { class: "gta-map-markers" });
    const lockedAreasOverlay = createElement("div", { class: "gta-map-locked-areas" });
    const detailsPanel = createElement("div", { class: "gta-map-details hidden" });
    const missionHudPanel = createElement("div", { class: "gta-mission-hud hidden" });

    let mapImage = Imagex({
        src: "",
        fallback: "/assets/maps/loc/fallback_map.png",
        class: "gta-map-image",
        alt: "GTA Map",
        draggable: false
    });

    const transformLayer = createElement("div", { class: "gta-map-transform-layer" }, [
        mapImage,
        lockedAreasOverlay,
        svgRouteLayer,
        markersOverlay
    ]);

    const mapViewport = createElement("div", { class: "gta-map-viewport" }, [
        transformLayer,
        missionHudPanel
    ]);

    mapWrapper.appendChild(mapHeader);
    mapWrapper.appendChild(mapViewport);
    mapWrapper.appendChild(detailsPanel);
    container.appendChild(mapWrapper);

    // Apply transformation updates using ZoomBox Helper
    function applyTransform() {
        updateTransform(transformLayer, state);

        // Adjust marker proportions relative to current zoom level
        const counterScale = Math.max(0.6, 1 / Math.sqrt(state.zoomLevel || 1));
        markersOverlay.style.setProperty("--gta-marker-scale", counterScale);
    }

    /* =========================================================
       Event Delegation & Gesture Handling via ZoomBox Helpers
       ========================================================= */

    // Mouse Dragging via ZoomBox Helper
    mapViewport.addEventListener("mousedown", (e) => {
        if (e.target.closest(".gta-marker") || e.target.closest(".gta-locked-area")) return;
        handleMouseDown(e, state, transformLayer);
    });

    // Touch Support via ZoomBox Helpers
    mapViewport.addEventListener("touchstart", (e) => handleTouchStart(e, state, transformLayer), { passive: false });
    mapViewport.addEventListener("touchmove", (e) => {
        handleTouchMove(e, state, transformLayer);
        applyTransform();
    }, { passive: false });
    mapViewport.addEventListener("touchend", (e) => handleTouchEnd(e, state));

    // Mouse Wheel Zooming via ZoomBox Helper
    mapViewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        smoothZoom(e, transformLayer, state, mapViewport);
        applyTransform();
    }, { passive: false });

    // Custom GTA Double-Click Waypoint Placement
    mapViewport.addEventListener("dblclick", (e) => {
        if (e.target.closest(".gta-marker")) return;

        const rect = transformLayer.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
            state.customWaypoint = { x: xPercent, y: yPercent };
            renderAllMarkers();
            renderRoutePaths();
        }
    });

    /* =========================================================
       Mission & Route System Features
       ========================================================= */

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

    function renderAllMarkers() {
        markersOverlay.innerHTML = "";

        // 1. Render Location Markers
        (state.locations || []).forEach(renderSingleMarker);

        // 2. Render Player Marker
        if (state.playerPos) {
            const playerEl = createElement("div", {
                class: "gta-marker gta-marker-player",
                style: { left: `${state.playerPos.x}%`, top: `${state.playerPos.y}%` }
            }, [
                createElement("span", { class: "gta-marker-icon" }, ["▲"])
            ]);
            markersOverlay.appendChild(playerEl);
        }

        // 3. Render Custom Waypoint Marker
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
                createElement("span", { class: "gta-marker-label" }, ["Waypoint (Click to remove)"])
            ]);
            markersOverlay.appendChild(waypointEl);
        }

        // 4. Render Delivery Mission Markers
        if (state.activeMission) {
            const { from, to } = state.activeMission;

            const pickupEl = createElement("div", {
                class: "gta-marker gta-marker-delivery-from",
                style: { left: `${from.x}%`, top: `${from.y}%` }
            }, [
                createElement("span", { class: "gta-marker-icon" }, ["📦"]),
                createElement("span", { class: "gta-marker-label" }, ["Pickup Point"])
            ]);

            const dropEl = createElement("div", {
                class: "gta-marker gta-marker-delivery-to",
                style: { left: `${to.x}%`, top: `${to.y}%` }
            }, [
                createElement("span", { class: "gta-marker-icon" }, ["🏁"]),
                createElement("span", { class: "gta-marker-label" }, ["Delivery Target"])
            ]);

            markersOverlay.appendChild(pickupEl);
            markersOverlay.appendChild(dropEl);
        }
    }

    function renderSingleMarker(loc) {
        const iconElement = loc.iconUrl
            ? Imagex({ src: loc.iconUrl, fallback: "/assets/icon-192.png", class: "gta-marker-img-icon", alt: loc.name })
            : createElement("span", { class: "gta-marker-icon" }, [loc.icon || "📍"]);

        const marker = createElement("div", {
            class: `gta-marker gta-marker-${loc.category || "default"}`,
            style: { left: `${loc.x}%`, top: `${loc.y}%` },
            dataset: { id: loc.id },
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

        markersOverlay.appendChild(marker);
    }

    function updateMissionHUD() {
        if (!state.activeMission) {
            missionHudPanel.classList.add("hidden");
            return;
        }

        const m = state.activeMission;
        missionHudPanel.innerHTML = "";

        const title = createElement("div", { class: "gta-hud-title" }, [`Delivery: ${m.title}`]);
        const reward = createElement("div", { class: "gta-hud-reward" }, [`Reward: $${m.reward}`]);
        const cancelBtn = createElement("button", {
            class: "gta-btn-cancel-mission",
            events: {
                click: () => {
                    state.activeMission = null;
                    updateMissionHUD();
                    renderAllMarkers();
                    renderRoutePaths();
                }
            }
        }, ["Cancel Mission"]);

        missionHudPanel.appendChild(title);
        missionHudPanel.appendChild(reward);
        missionHudPanel.appendChild(cancelBtn);
        missionHudPanel.classList.remove("hidden");
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

        if (loc.mission) {
            const startMissionBtn = createElement("button", {
                class: "gta-btn-mission-start",
                events: {
                    click: () => {
                        state.activeMission = {
                            id: loc.mission.id,
                            title: loc.mission.title,
                            reward: loc.mission.reward,
                            from: { x: loc.x, y: loc.y },
                            to: loc.mission.target
                        };
                        detailsPanel.classList.add("hidden");
                        updateMissionHUD();
                        renderAllMarkers();
                        renderRoutePaths();
                    }
                }
            }, [`Start Delivery ($${loc.mission.reward})`]);

            detailsPanel.appendChild(startMissionBtn);
        }

        if (isLoggedIn && loc.membersOnly && loc.details?.intelData) {
            detailsPanel.appendChild(
                createElement("div", { class: "gta-details-secret" }, [
                    `🔒 Exclusive Intel: ${loc.details.intelData}`
                ])
            );
        }

        detailsPanel.classList.remove("hidden");
    }

    /* =========================================================
       API & Data Fetching
       ========================================================= */

    async function loadMapData() {
        try {
            markersOverlay.innerHTML = "";
            lockedAreasOverlay.innerHTML = "";
            svgRouteLayer.innerHTML = "";
            detailsPanel.classList.add("hidden");

            const response = await apiFetch(`/gta/map?entity=${state.activeEntity}&auth=${isLoggedIn}`);
            const mapData = response?.data || response;

            state.locations = mapData?.locations || [];
            state.deliveryMissions = mapData?.deliveryMissions || [];
            state.playerPos = mapData?.playerPos || { x: 50, y: 50 };

            const newMapImage = Imagex({
                src: mapData?.map?.image || `${SRC_URL || ""}/assets/maps/loc/${state.activeEntity}_map.jpg`,
                fallback: mapData?.map?.fallbackImage || "/assets/maps/loc/fallback_map.png",
                class: "gta-map-image",
                alt: mapData?.title || "GTA Map",
                draggable: false
            });

            transformLayer.replaceChild(newMapImage, mapImage);
            mapImage = newMapImage;

            renderLockedAreas(mapData?.lockedAreas || []);
            renderAllMarkers();
            renderRoutePaths();
            updateMissionHUD();
            applyTransform();
        } catch (err) {
            console.error("Failed to load map data:", err);
            markersOverlay.innerHTML = `<div class="gta-map-error">Error fetching map features.</div>`;
        }
    }

    function renderLockedAreas(areas) {
        lockedAreasOverlay.innerHTML = "";
        areas.forEach((area) => {
            const lockedEl = createElement("div", {
                class: "gta-locked-area",
                style: {
                    left: `${area.x}%`,
                    top: `${area.y}%`,
                    width: `${area.width}%`,
                    height: `${area.height}%`
                }
            }, [
                createElement("div", { class: "gta-locked-content" }, [
                    createElement("span", { class: "gta-locked-icon" }, ["🔒"]),
                    createElement("span", { class: "gta-locked-label" }, [area.label])
                ])
            ]);
            lockedAreasOverlay.appendChild(lockedEl);
        });
    }

    await loadMapData();
}