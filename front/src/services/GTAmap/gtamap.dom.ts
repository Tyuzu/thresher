import { createElement } from "../../components/createElement.js";
import { Imagex } from "../../components/base/Imagex.js";
import type { GtaMapState } from "./gtamap.types";

export function createMapStructure(container: HTMLElement, _state: GtaMapState, callbacks: {
    onEntityChange: (v: string) => Promise<void>;
    copyPermalink: () => void;
    toggleFullscreen: () => void;
    onMeasureToggle: () => void;
}) {
    container.innerHTML = "";

    const mapWrapper = createElement("div", { class: "gta-map-wrapper" });
    const entitySelector = createElement("select", {
        class: "gta-map-selector",
        events: {
            change: async (e: Event) => {
                const target = e.target as HTMLSelectElement;
                await callbacks.onEntityChange(target.value);
            }
        }
    }, [
        createElement("option", { value: "ls" }, ["Los Santos"]),
        createElement("option", { value: "cp" }, ["Cayo Perico"]),
        createElement("option", { value: "sa" }, ["San Andreas"])
    ]) as HTMLSelectElement;

    const floorSelectorBar = createElement("div", { class: "gta-floor-selector hidden" });
    const shareBtn = createElement("button", {
        class: "gta-btn-share",
        events: { click: () => callbacks.copyPermalink() }
    }, ["🔗 Share Link"]);
    const fullScreenBtn = createElement("button", {
        class: "gta-btn-fullscreen",
        events: { click: () => callbacks.toggleFullscreen() }
    }, ["⛶"]);
    const measureBtn = createElement("button", {
        class: "gta-btn-measure",
        events: {
            click: () => callbacks.onMeasureToggle()
        }
    }, ["📏 Ruler"]);

    const zoomInBtn = createElement("button", { class: "gta-btn-zoom-in" }, ["+"]);
    const zoomOutBtn = createElement("button", { class: "gta-btn-zoom-out" }, ["−"]);
    const zoomResetBtn = createElement("button", { class: "gta-btn-zoom-reset" }, ["Reset"]);

    const zoomControls = createElement("div", { class: "gta-zoom-controls" }, [
        shareBtn,
        measureBtn,
        fullScreenBtn,
        zoomInBtn,
        zoomOutBtn,
        zoomResetBtn
    ]);

    const categoryFilterBar = createElement("div", { class: "gta-category-filters" });
    const mapHeader = createElement("div", { class: "gta-map-header" }, [
        createElement("h3", { class: "gta-map-title" }, ["GTA Map Explorer"]),
        categoryFilterBar,
        createElement("div", { class: "gta-map-header-actions" }, [entitySelector, zoomControls])
    ]);

    const svgTerritoryLayer = createElement("svg", { class: "gta-map-territories-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none" }) as unknown as SVGElement;
    const svgRouteLayer = createElement("svg", { class: "gta-map-routes-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none" }) as unknown as SVGElement;
    const svgMeasureLayer = createElement("svg", { class: "gta-map-measure-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none" }) as unknown as SVGElement;

    const markersOverlay = createElement("div", { class: "gta-map-markers" });
    const lockedAreasOverlay = createElement("div", { class: "gta-map-locked-areas" });
    const detailsPanel = createElement("div", { class: "gta-map-details hidden" });
    const missionHudPanel = createElement("div", { class: "gta-mission-hud hidden" });
    const coordsOverlay = createElement("div", { class: "gta-coords-overlay" }, ["X: 0.00 | Y: 0.00"]);

    const radarContainer = createElement("div", { class: "gta-radar-container" });
    const radarCanvas = createElement("canvas", { class: "gta-radar-canvas", width: "150", height: "150" }) as HTMLCanvasElement;
    radarContainer.appendChild(radarCanvas);

    let mapImage = Imagex({
        src: "",
        fallback: "/assets/maps/loc/fallback_map.png",
        class: "gta-map-image",
        alt: "GTA Map",
        draggable: false
    }) as HTMLImageElement;

    const transformLayer = createElement("div", { class: "gta-map-transform-layer" }, [
        mapImage, svgTerritoryLayer, lockedAreasOverlay, svgRouteLayer, svgMeasureLayer, markersOverlay]);

    const mapViewport = createElement("div", { class: "gta-map-viewport" }, [
        transformLayer, floorSelectorBar, missionHudPanel, coordsOverlay, radarContainer]);

    mapWrapper.appendChild(mapHeader);
    mapWrapper.appendChild(mapViewport);
    mapWrapper.appendChild(detailsPanel);
    container.appendChild(mapWrapper);

    return {
        mapWrapper,
        entitySelector,
        floorSelectorBar,
        shareBtn,
        fullScreenBtn,
        measureBtn,
        zoomInBtn,
        zoomOutBtn,
        zoomResetBtn,
        zoomControls,
        categoryFilterBar,
        mapHeader,
        svgTerritoryLayer,
        svgRouteLayer,
        svgMeasureLayer,
        markersOverlay,
        lockedAreasOverlay,
        detailsPanel,
        missionHudPanel,
        coordsOverlay,
        radarCanvas,
        mapImage,
        transformLayer,
        mapViewport
    };
}
