/**
 * Clamp a number between min and max.
 */
export function clamp(v, min, max) {
  let low = min;
  let high = max;
  if (low > high) [low, high] = [high, low];
  return v < low ? low : v > high ? high : v;
}

/**
 * Update map container transform (position + zoom).
 */
export function updateMapTransform(state, mapOptions, mapWrapper) {
  if (!mapWrapper || !mapOptions) return;

  const { mapWidth = 0, mapHeight = 0 } = mapOptions;
  const { viewportWidth, viewportHeight, zoom } = state;

  const minX = viewportWidth - mapWidth * zoom;
  const minY = viewportHeight - mapHeight * zoom;

  state.mapX = clamp(state.mapX, Math.min(minX, 0), 0);
  state.mapY = clamp(state.mapY, Math.min(minY, 0), 0);

  if (!state.transformRaf) {
    state.transformRaf = requestAnimationFrame(() => {
      mapWrapper.style.transform = `translate(${Math.round(state.mapX)}px, ${Math.round(state.mapY)}px) scale(${zoom})`;
      state.transformRaf = null;
    });
  }
}

/**
 * Update minimap viewport indicator rectangle.
 */
export function updateMinimapViewport(state, mapOptions, minimap, minimapViewport) {
  if (!minimap || !minimapViewport) return;

  const { mapWidth = 0 } = mapOptions;
  const { viewportWidth, viewportHeight, zoom } = state;

  const img = minimap.querySelector("img");
  const minimapRect = minimap.getBoundingClientRect();
  const imgWidth = img?.naturalWidth || mapWidth || 1;
  const scale = minimapRect.width / imgWidth;

  state.minimapScale = scale;

  const viewportW = (viewportWidth / zoom) * scale;
  const viewportH = (viewportHeight / zoom) * scale;
  const left = (-state.mapX / zoom) * scale;
  const top = (-state.mapY / zoom) * scale;

  const style = minimapViewport.style;
  style.width = `${Math.round(viewportW)}px`;
  style.height = `${Math.round(viewportH)}px`;
  style.left = `${Math.round(left)}px`;
  style.top = `${Math.round(top)}px`;
}

/**
 * Update main transform and minimap in lockstep.
 */
export function updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport) {
  updateMapTransform(state, mapOptions, mapWrapper);
  updateMinimapViewport(state, mapOptions, minimap, minimapViewport);
}

/**
 * Safely attach an event listener and record it in `state.listeners`.
 */
export function addListener(state, target, event, fn, opts = {}) {
  if (!target || typeof fn !== "function") return;

  target.addEventListener(event, fn, opts);
  if (!Array.isArray(state.listeners)) {
    state.listeners = [];
  }
  state.listeners.push({ target, event, fn, opts });
}

/**
 * Remove all tracked listeners from `state.listeners`.
 */
export function removeAllListeners(state) {
  if (!state?.listeners) return;
  for (const { target, event, fn, opts } of state.listeners) {
    try {
      target.removeEventListener(event, fn, opts);
    } catch (_) {
      // ignore
    }
  }
  state.listeners.length = 0;
}

/**
 * Remove a specific tracked event listener.
 */
export function removeListener(state, target, event, fn) {
  if (!state?.listeners) return;
  state.listeners = state.listeners.filter((rec) => {
    if (rec.target === target && rec.event === event && rec.fn === fn) {
      try {
        target.removeEventListener(event, fn, rec.opts);
      } catch (_) {
        // ignore
      }
      return false;
    }
    return true;
  });
}