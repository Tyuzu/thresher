import { CSS_PREFIX } from "./getcss.js";
import { addListener, clamp, updateTransformAll } from "./utilities.js";

function setDraggingTransition(mapWrapper, enable) {
  if (mapWrapper) {
    mapWrapper.style.transition = enable ? "transform 0.05s linear" : "none";
  }
}

function onPointerDown(state, mapOptions, mapContainer, e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (e.target.closest(`.${CSS_PREFIX}-marker, .${CSS_PREFIX}-locked-area`)) return;

  const mapWrapper = mapContainer.querySelector(`.${CSS_PREFIX}-wrapper`);
  setDraggingTransition(mapWrapper, false);
  stopInertia(state);

  state.isDragging = true;
  state.lastPointerX = e.clientX ?? 0;
  state.lastPointerY = e.clientY ?? 0;
  state.velocityX = 0;
  state.velocityY = 0;

  if (mapContainer.setPointerCapture) {
    mapContainer.setPointerCapture(e.pointerId);
  }
  mapContainer.style.cursor = "grabbing";
  if (e.cancelable) e.preventDefault();
}

function onPointerMove(state, mapOptions, mapWrapper, minimap, minimapViewport, e) {
  if (!state.isDragging) return;

  const clientX = e.clientX ?? 0;
  const clientY = e.clientY ?? 0;
  const dx = clientX - state.lastPointerX;
  const dy = clientY - state.lastPointerY;

  state.mapX += dx;
  state.mapY += dy;
  state.velocityX = dx;
  state.velocityY = dy;
  state.lastPointerX = clientX;
  state.lastPointerY = clientY;

  updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
}

function onPointerUp(state, mapContainer, mapOptions, mapWrapper, minimap, minimapViewport, e) {
  if (!state.isDragging) return;
  state.isDragging = false;
  mapContainer.style.cursor = "grab";

  if (mapContainer.hasPointerCapture && mapContainer.hasPointerCapture(e.pointerId)) {
    try {
      mapContainer.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  const threshold = mapOptions.inertiaStartThreshold || 0.5;
  if (mapOptions.enableInertia && (Math.abs(state.velocityX) > threshold || Math.abs(state.velocityY) > threshold)) {
    startInertia(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }
  setDraggingTransition(mapWrapper, true);
}

function onWheel(e, state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport) {
  if (e.target.closest(`.${CSS_PREFIX}-marker, .${CSS_PREFIX}-locked-area`)) return;
  if (e.cancelable) e.preventDefault();

  const delta = e.deltaY < 0 ? 1 : -1;
  const nextZoom = clamp(state.zoom + delta * mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
  if (nextZoom === state.zoom) return;

  const rect = mapContainer.getBoundingClientRect();
  const pointerX = e.clientX - rect.left;
  const pointerY = e.clientY - rect.top;

  const scale = nextZoom / state.zoom;
  state.mapX -= (pointerX - state.mapX) * (scale - 1);
  state.mapY -= (pointerY - state.mapY) * (scale - 1);
  state.zoom = nextZoom;

  updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
}

function onMinimapClick(ev, state, mapOptions, mapWrapper, minimap, minimapViewport) {
  if (!state.minimapScale) return;
  const rect = minimap.getBoundingClientRect();
  const clickedX = ev.clientX - rect.left;
  const clickedY = ev.clientY - rect.top;
  const mapX = clickedX / state.minimapScale;
  const mapY = clickedY / state.minimapScale;

  state.mapX = state.viewportWidth / 2 - mapX * state.zoom;
  state.mapY = state.viewportHeight / 2 - mapY * state.zoom;
  updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
}

function handleKeyboardPanZoom(e, state, mapOptions, mapWrapper, minimap, minimapViewport) {
  if (e.cancelable) e.preventDefault();
  const panStep = mapOptions.keyboardPanStep || 50;

  switch (e.key) {
    case "ArrowUp":
      state.mapY += panStep;
      break;
    case "ArrowDown":
      state.mapY -= panStep;
      break;
    case "ArrowLeft":
      state.mapX += panStep;
      break;
    case "ArrowRight":
      state.mapX -= panStep;
      break;
    case "+":
    case "=":
      state.zoom = clamp(state.zoom + mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
      break;
    case "-":
      state.zoom = clamp(state.zoom - mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
      break;
  }
  updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
}

function startInertia(state, mapOptions, mapWrapper, minimap, minimapViewport) {
  stopInertia(state);
  state.inertiaActive = true;
  const friction = mapOptions.inertiaFriction ?? 0.92;
  const stopThreshold = mapOptions.inertiaStopThreshold ?? 0.1;

  function step() {
    state.velocityX *= friction;
    state.velocityY *= friction;
    state.mapX += state.velocityX;
    state.mapY += state.velocityY;

    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);

    if (Math.abs(state.velocityX) > stopThreshold || Math.abs(state.velocityY) > stopThreshold) {
      state.inertiaFrame = requestAnimationFrame(step);
    } else {
      stopInertia(state);
    }
  }
  state.inertiaFrame = requestAnimationFrame(step);
}

export function stopInertia(state) {
  if (state.inertiaActive && state.inertiaFrame) {
    cancelAnimationFrame(state.inertiaFrame);
    state.inertiaActive = false;
    state.inertiaFrame = null;
  }
}

function rafThrottle(state, fn) {
  return (...args) => {
    if (state.rafPending) {
      state._lastArgs = args;
      return;
    }
    state.rafPending = true;
    state._lastArgs = null;
    requestAnimationFrame(() => {
      state.rafPending = false;
      fn(...args);
      if (state._lastArgs) {
        fn(...state._lastArgs);
      }
    });
  };
}

export function bindInteractions(state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport) {
  addListener(state, mapContainer, "pointerdown", (e) => onPointerDown(state, mapOptions, mapContainer, e), { passive: false });
  addListener(state, window, "pointermove", rafThrottle(state, (e) => onPointerMove(state, mapOptions, mapWrapper, minimap, minimapViewport, e)));
  addListener(state, window, "pointerup", (e) => onPointerUp(state, mapContainer, mapOptions, mapWrapper, minimap, minimapViewport, e));
  addListener(state, window, "pointercancel", (e) => onPointerUp(state, mapContainer, mapOptions, mapWrapper, minimap, minimapViewport, e));

  addListener(state, mapContainer, "wheel", (e) => onWheel(e, state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport), { passive: false });

  if (minimap) {
    addListener(state, minimap, "click", (e) => onMinimapClick(e, state, mapOptions, mapWrapper, minimap, minimapViewport), { passive: true });
  }

  addListener(state, mapContainer, "keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "+", "-", "="].includes(e.key)) {
      handleKeyboardPanZoom(e, state, mapOptions, mapWrapper, minimap, minimapViewport);
    }
  }, { passive: false });

  mapContainer.style.cursor = "grab";
  mapContainer.style.touchAction = "none";
}