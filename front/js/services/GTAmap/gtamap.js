import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import Imagex from "../../components/base/Imagex.js";

/**
 * Display a GTA-style map with pan/zoom, locked areas, and marker interaction.
 *
 * @param {HTMLElement} container
 * @param {boolean} isLoggedIn
 * @param {string} entity - entity id ("ls","sf","lv") - optional, defaults to "ls"
 */
export async function displayGtaMap(container, isLoggedIn, entity = "ls") {
  // 1. Cleanup previous map state & event listeners to prevent memory leaks
  if (container.__gtaMapCleanup) {
    container.__gtaMapCleanup();
  }

  // Ensure container has relative positioning for absolute overlays
  container.style.position = "relative";
  container.innerHTML = "";

  // 2. Fetch Data
  let config = {};
  let markers = [];
  try {
    const [configRes, markersRes] = await Promise.all([
      apiFetch(`/maps/config/${encodeURIComponent(entity)}`),
      apiFetch(`/maps/markers/${encodeURIComponent(entity)}`)
    ]);
    config = configRes;
    markers = markersRes;
  } catch (err) {
    console.error("Failed to load map data, falling back:", err);
    config = { mapImage: "/assets/gta-map.jpg", mapWidth: 1200, mapHeight: 600, entity };
    markers = [];
  }

  const mapWidth = config.mapWidth || 1200;
  const mapHeight = config.mapHeight || 600;
  const mapImageUrl = config.mapImage || "/assets/gta-map.jpg";

  let viewportWidth = Math.max(300, window.innerWidth);
  let viewportHeight = Math.max(200, Math.round(window.innerHeight * 0.9));

  // 3. UI Controls
  const advanceBtn = createElement(
    "button",
    { id: "advance-btn", style: "position:relative;margin-bottom:8px;padding:6px 12px;cursor:pointer;z-index:40;" },
    ["▶ Advance Mission"]
  );

  advanceBtn.addEventListener("click", async () => {
    try {
      await apiFetch(`/player/progress?entity=${encodeURIComponent(entity)}`, "POST");
      displayGtaMap(container, isLoggedIn, entity);
    } catch (err) {
      console.error("Failed to advance mission:", err);
    }
  });

  const mapContainer = createElement("div", {
    id: "map-container",
    style: `position:relative;overflow:hidden;width:${viewportWidth}px;height:${viewportHeight}px;border:2px solid #333;cursor:grab;background:#000;touch-action:none;`,
  });

  const mapInner = Imagex({
    id: "map-inner",
    src: mapImageUrl,
    width: String(mapWidth),
    height: String(mapHeight),
    style: `display:block;width:${mapWidth}px;height:${mapHeight}px;user-drag:none;pointer-events:none;`,
  });

  const markerLayer = createElement("div", {
    id: "marker-layer",
    style: `position:absolute;left:0;top:0;width:${mapWidth}px;height:${mapHeight}px;pointer-events:none;`,
  });

  const lockedLayer = createElement("div", {
    id: "locked-layer",
    style: `position:absolute;left:0;top:0;width:${mapWidth}px;height:${mapHeight}px;pointer-events:none;`,
  });

  const mapWrapper = createElement("div", {
    id: "map-wrapper",
    style: `position:absolute;left:0;top:0;width:${mapWidth}px;height:${mapHeight}px;transform-origin:0 0;will-change:transform;`,
  }, [mapInner, markerLayer, lockedLayer]);

  mapContainer.appendChild(mapWrapper);

  // Overlays
  const legend = createElement("div", {
    id: "legend",
    style: "position:absolute;top:10px;left:10px;background:rgba(34,34,34,0.9);color:#fff;padding:8px;display:none;z-index:50;font-size:13px;border-radius:4px;",
  }, [
    createElement("div", {}, ["🏠 Safehouse"]),
    createElement("div", {}, ["⭐ Mission"]),
    createElement("div", {}, ["💲 Shop"]),
    createElement("div", {}, ["💀 Enemy"]),
  ]);

  const zoomInBtn = createElement("button", { style: "width:32px;height:32px;cursor:pointer;font-weight:bold;" }, ["+"]);
  const zoomOutBtn = createElement("button", { style: "width:32px;height:32px;cursor:pointer;font-weight:bold;" }, ["−"]);

  const zoomControls = createElement("div", {
    id: "zoom-controls",
    style: "position:absolute;top:10px;right:10px;z-index:50;display:flex;flex-direction:column;gap:6px;",
  }, [zoomInBtn, zoomOutBtn]);

  const minimapImage = Imagex({
    src: mapImageUrl,
    style: "width:100%;height:100%;object-fit:cover;display:block;",
  });

  const minimapViewport = createElement("div", {
    id: "minimap-viewport",
    style: "position:absolute;border:2px solid red;pointer-events:none;box-sizing:border-box;",
  });

  const minimap = createElement("div", {
    id: "minimap",
    style: `position:absolute;bottom:10px;right:10px;width:120px;height:120px;border:2px solid #333;overflow:hidden;z-index:50;background:#000;border-radius:4px;`,
  }, [minimapImage, minimapViewport]);

  const infoTitle = createElement("h3", { style: "margin:0 0 6px 0;font-size:16px;" }, ["Info"]);
  const infoContent = createElement("p", { style: "margin:0 0 8px 0;font-size:13px;" }, ["Click a marker to see details"]);
  const closeBtn = createElement("button", { style: "float:right;cursor:pointer;" }, ["✕"]);

  const infoPanel = createElement("div", {
    id: "info-panel",
    style: "position:absolute;bottom:10px;left:10px;width:240px;background:#fff;color:#000;border:1px solid #333;padding:10px;display:none;z-index:60;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.3);",
  }, [closeBtn, infoTitle, infoContent]);

  closeBtn.addEventListener("click", () => {
    infoPanel.style.display = "none";
  });

  // Assemble Map Structure
  mapContainer.appendChild(legend);
  mapContainer.appendChild(zoomControls);
  mapContainer.appendChild(minimap);
  mapContainer.appendChild(infoPanel);

  container.appendChild(advanceBtn);
  container.appendChild(mapContainer);

  // 4. Render Markers
  const emojiMap = { house: "🏠", mission: "⭐", shop: "💲", enemy: "💀" };

  markers.forEach((marker) => {
    const el = createElement("div", {
      class: "marker",
      style: `
        position:absolute;
        left:${marker.x}px;
        top:${marker.y}px;
        font-size:22px;
        cursor:pointer;
        pointer-events:auto;
        z-index:5;
        transform:translate(-50%,-50%);
        user-select:none;
      `,
      title: marker.name,
    }, [emojiMap[marker.type] || "❓"]);

    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      infoTitle.textContent = marker.name;
      infoContent.textContent = `Type: ${marker.type}`;
      infoPanel.style.display = "block";
    });

    markerLayer.appendChild(el);
  });

  // 5. Render Locked Areas (Granular overlapping logic)
  const lockedAreas = Array.isArray(config.lockedAreas) ? config.lockedAreas : [];
  if (lockedAreas.length > 0) {
    lockedLayer.style.pointerEvents = "auto";
    
    lockedAreas.forEach((area) => {
      // Check if THIS specific area overlaps a marker
      const isOverlapping = markers.some(
        (mk) => mk.x >= area.x && mk.x <= area.x + area.width && mk.y >= area.y && mk.y <= area.y + area.height
      );

      if (isOverlapping) {
        console.warn(`Skipping locked area "${area.label}" due to marker overlap.`);
        return; // Skip rendering this specific locked area
      }

      const lockInfoNodes = [];
      if (area.dependsOn) lockInfoNodes.push(createElement("div", {}, [`Requires: ${String(area.dependsOn).toUpperCase()}`]));
      if (area.condition) lockInfoNodes.push(createElement("div", {}, [String(area.condition)]));

      const lockedDiv = createElement("div", {
        class: "locked-area",
        style: `
          position:absolute;
          left:${area.x}px;
          top:${area.y}px;
          width:${area.width}px;
          height:${area.height}px;
          background:rgba(0,0,0,0.55);
          color:#fff;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          font-size:12px;
          text-align:center;
          pointer-events:auto;
          z-index:10;
          padding:4px;
          box-sizing:border-box;
        `,
      }, [createElement("div", { style: "font-weight:bold;" }, [`🚫 ${area.label}`]), ...lockInfoNodes]);

      lockedLayer.appendChild(lockedDiv);
    });
  }

  // 6. Viewport State & Math Dynamics
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let mapX = Math.round((viewportWidth - mapWidth) / 2);
  let mapY = Math.round((viewportHeight - mapHeight) / 2);
  let zoom = 1;

  function applyTransform() {
    mapWrapper.style.transform = `translate3d(${mapX}px, ${mapY}px, 0px) scale(${zoom})`;
    updateMinimap();
  }

  function updateMinimap() {
    const visibleWidth = viewportWidth / zoom;
    const visibleHeight = viewportHeight / zoom;
    const minimapScale = minimap.offsetWidth / mapWidth;

    minimapViewport.style.width = `${Math.min(minimap.offsetWidth, visibleWidth * minimapScale)}px`;
    minimapViewport.style.height = `${Math.min(minimap.offsetHeight, visibleHeight * minimapScale)}px`;
    minimapViewport.style.left = `${Math.max(0, -mapX * minimapScale)}px`;
    minimapViewport.style.top = `${Math.max(0, -mapY * minimapScale)}px`;
  }

  function zoomAtPoint(factor, focalX, focalY) {
    const newZoom = Math.min(Math.max(0.5, zoom * factor), 4.0);
    const scaleRatio = newZoom / zoom;

    // Adjust position around focal point (center of viewport)
    mapX = focalX - (focalX - mapX) * scaleRatio;
    mapY = focalY - (focalY - mapY) * scaleRatio;
    zoom = newZoom;

    applyTransform();
  }

  // 7. Event Listeners with Pointer Capture
  const onPointerDown = (e) => {
    if (e.target.closest("#zoom-controls, #info-panel, #legend, button")) return;
    isDragging = true;
    startX = e.clientX - mapX;
    startY = e.clientY - mapY;
    mapContainer.style.cursor = "grabbing";
    mapContainer.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    mapX = e.clientX - startX;
    mapY = e.clientY - startY;
    applyTransform();
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    mapContainer.style.cursor = "grab";
    try { mapContainer.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = mapContainer.getBoundingClientRect();
    const focalX = e.clientX - rect.left;
    const focalY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    zoomAtPoint(factor, focalX, focalY);
  };

  const onKeyDown = (ev) => {
    if (ev.key && ev.key.toLowerCase() === "l") {
      legend.style.display = legend.style.display === "none" ? "block" : "none";
    }
  };

  const onResize = () => {
    viewportWidth = Math.max(300, window.innerWidth);
    viewportHeight = Math.max(200, Math.round(window.innerHeight * 0.9));
    mapContainer.style.width = `${viewportWidth}px`;
    mapContainer.style.height = `${viewportHeight}px`;
    applyTransform();
  };

  // Attach event listeners
  mapContainer.addEventListener("pointerdown", onPointerDown);
  mapContainer.addEventListener("pointermove", onPointerMove);
  mapContainer.addEventListener("pointerup", onPointerUp);
  mapContainer.addEventListener("pointercancel", onPointerUp);
  mapContainer.addEventListener("wheel", onWheel, { passive: false });

  zoomInBtn.addEventListener("click", () => zoomAtPoint(1.2, viewportWidth / 2, viewportHeight / 2));
  zoomOutBtn.addEventListener("click", () => zoomAtPoint(0.8, viewportWidth / 2, viewportHeight / 2));

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  // 8. Register Cleanup Handler
  container.__gtaMapCleanup = () => {
    mapContainer.removeEventListener("pointerdown", onPointerDown);
    mapContainer.removeEventListener("pointermove", onPointerMove);
    mapContainer.removeEventListener("pointerup", onPointerUp);
    mapContainer.removeEventListener("pointercancel", onPointerUp);
    mapContainer.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);
  };

  // Initial Draw
  applyTransform();
}