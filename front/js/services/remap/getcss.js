/* ---------- Constants & Default CSS ---------- */
export const CSS_PREFIX = "generic-map";

/**
 * Production CSS generator with fully dynamic CSS variables and unified layer stacking.
 */
export const DEFAULT_STYLE = `
:root {
  --${CSS_PREFIX}-bg: #000000;
  --${CSS_PREFIX}-text: #1a1a1a;
  --${CSS_PREFIX}-panel-bg: #ffffff;
  --${CSS_PREFIX}-panel-bg-alpha: rgba(255, 255, 255, 0.88);
  --${CSS_PREFIX}-border-color: rgba(0, 0, 0, 0.12);
  --${CSS_PREFIX}-viewport-border: rgba(0, 0, 0, 0.4);
  --${CSS_PREFIX}-viewport-fill: rgba(0, 0, 0, 0.08);
  --${CSS_PREFIX}-border-radius: 6px;
  --${CSS_PREFIX}-panel-padding: 8px 12px;
  --${CSS_PREFIX}-btn-size: 36px;
  --${CSS_PREFIX}-btn-gap: 6px;
  --${CSS_PREFIX}-minimap-size: 140px;
  
  /* Stacking layers */
  --${CSS_PREFIX}-z-wrapper: 1;
  --${CSS_PREFIX}-z-minimap: 40;
  --${CSS_PREFIX}-z-legend: 45;
  --${CSS_PREFIX}-z-zoom: 50;
  --${CSS_PREFIX}-z-info: 60;

  --${CSS_PREFIX}-height: 100%;
  --${CSS_PREFIX}-max-width: 100%;
}

/* Dark theme overrides */
:root[data-theme='dark'] {
  --${CSS_PREFIX}-bg: #0b0b0b;
  --${CSS_PREFIX}-text: #eaeaea;
  --${CSS_PREFIX}-panel-bg: #1e1e1e;
  --${CSS_PREFIX}-panel-bg-alpha: rgba(20, 20, 20, 0.88);
  --${CSS_PREFIX}-border-color: rgba(255, 255, 255, 0.12);
  --${CSS_PREFIX}-viewport-border: rgba(255, 255, 255, 0.5);
  --${CSS_PREFIX}-viewport-fill: rgba(255, 255, 255, 0.15);
}

/* Container */
.${CSS_PREFIX}-container {
  position: relative;
  overflow: hidden;
  touch-action: none;
  width: var(--${CSS_PREFIX}-max-width);
  height: var(--${CSS_PREFIX}-height);
  background: var(--${CSS_PREFIX}-bg);
  color: var(--${CSS_PREFIX}-text);
  display: block;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}

/* Transforming Map Canvas Wrapper */
.${CSS_PREFIX}-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: auto;
  touch-action: none;
  z-index: var(--${CSS_PREFIX}-z-wrapper);
}

/* Map Image */
.${CSS_PREFIX}-inner {
  display: block;
  user-select: none;
  pointer-events: none;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
  image-rendering: auto;
  -webkit-user-drag: none;
}

/* Interactive Marker Layer */
.${CSS_PREFIX}-marker-layer {
  position: absolute;
  inset: 0;
  pointer-events: auto;
}

/* Positioned Markers & Elements */
.${CSS_PREFIX}-marker,
.${CSS_PREFIX}-user-marker,
.${CSS_PREFIX}-locked-area {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.${CSS_PREFIX}-marker {
  cursor: pointer;
  font-size: 18px;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
  padding: 4px;
  border-radius: 50%;
  transition: transform 0.1s ease-out;
}
.${CSS_PREFIX}-marker:hover {
  transform: translate(-50%, -50%) scale(1.15);
}
.${CSS_PREFIX}-marker:focus-visible {
  outline: 2px solid #0070f3;
  outline-offset: 2px;
}

.${CSS_PREFIX}-user-marker {
  font-size: 20px;
  cursor: default;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
}

.${CSS_PREFIX}-locked-area {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: not-allowed;
  background: rgba(255, 0, 0, 0.08);
  border: 1px solid rgba(255, 0, 0, 0.25);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  padding: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #ff4d4d;
}

/* Controls */
.${CSS_PREFIX}-zoom-controls {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: var(--${CSS_PREFIX}-z-zoom);
  display: flex;
  flex-direction: column;
  gap: var(--${CSS_PREFIX}-btn-gap);
  align-items: center;
  background: var(--${CSS_PREFIX}-panel-bg-alpha);
  border: 1px solid var(--${CSS_PREFIX}-border-color);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  padding: 4px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.${CSS_PREFIX}-btn {
  width: var(--${CSS_PREFIX}-btn-size);
  height: var(--${CSS_PREFIX}-btn-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--${CSS_PREFIX}-text);
  border: none;
  border-radius: var(--${CSS_PREFIX}-border-radius);
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  transition: background 0.12s ease, transform 0.08s ease;
  user-select: none;
}
.${CSS_PREFIX}-btn:hover { background: rgba(127, 127, 127, 0.15); }
.${CSS_PREFIX}-btn:active { transform: scale(0.94); }
.${CSS_PREFIX}-btn:focus-visible { outline: 2px solid #0070f3; }

/* Minimap */
.${CSS_PREFIX}-minimap {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: var(--${CSS_PREFIX}-minimap-size);
  height: var(--${CSS_PREFIX}-minimap-size);
  overflow: hidden;
  z-index: var(--${CSS_PREFIX}-z-minimap);
  border: 1px solid var(--${CSS_PREFIX}-border-color);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  background: rgba(0, 0, 0, 0.2);
  display: block;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  cursor: pointer;
}
.${CSS_PREFIX}-minimap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.${CSS_PREFIX}-minimap-viewport {
  position: absolute;
  border: 1.5px solid var(--${CSS_PREFIX}-viewport-border);
  box-sizing: border-box;
  pointer-events: none;
  background: var(--${CSS_PREFIX}-viewport-fill);
  will-change: left, top, width, height;
}

/* Info & Legend Panels */
.${CSS_PREFIX}-info-panel {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: var(--${CSS_PREFIX}-z-info);
  background: var(--${CSS_PREFIX}-panel-bg-alpha);
  color: var(--${CSS_PREFIX}-text);
  padding: var(--${CSS_PREFIX}-panel-padding);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  border: 1px solid var(--${CSS_PREFIX}-border-color);
  display: none;
  min-width: 180px;
  max-width: 280px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
}

.${CSS_PREFIX}-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  padding: var(--${CSS_PREFIX}-panel-padding);
  background: var(--${CSS_PREFIX}-panel-bg-alpha);
  color: var(--${CSS_PREFIX}-text);
  z-index: var(--${CSS_PREFIX}-z-legend);
  border-radius: var(--${CSS_PREFIX}-border-radius);
  border: 1px solid var(--${CSS_PREFIX}-border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  font-size: 13px;
}

@media (max-width: 520px) {
  :root {
    --${CSS_PREFIX}-minimap-size: 100px;
    --${CSS_PREFIX}-btn-size: 32px;
  }
  .${CSS_PREFIX}-legend { display: none; }
}
`;