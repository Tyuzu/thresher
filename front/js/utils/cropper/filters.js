// filters.js

import {
  DEFAULT_ADJUSTMENTS,
  CONTROL_CONFIG,
  PRESETS
} from "./constants.js";

const adjustments = {
  ...DEFAULT_ADJUSTMENTS
};

const controlRefs = {};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getAdjustments() {
  return adjustments;
}

export function getControlRefs() {
  return controlRefs;
}

export function registerControl(key, refs) {
  controlRefs[key] = refs;
}

export function unregisterControl(key) {
  delete controlRefs[key];
}

export function resetControls() {
  Object.keys(controlRefs).forEach((key) => {
    delete controlRefs[key];
  });
}

export function formatControlValue(key, value) {
  switch (key) {
    case "brightness":
    case "contrast":
    case "saturation":
      return `${Math.round(value * 100)}%`;

    case "blur":
      return `${Number(value).toFixed(1)}px`;

    case "hueRotate":
      return `${Math.round(value)}°`;

    case "grayscale":
    case "sepia":
    case "invert":
      return `${Math.round(value * 100)}%`;

    default:
      return String(value);
  }
}

export function buildFilterString() {
  return [
    `brightness(${adjustments.brightness})`,
    `contrast(${adjustments.contrast})`,
    `saturate(${adjustments.saturation})`,
    `blur(${adjustments.blur}px)`,
    `hue-rotate(${adjustments.hueRotate}deg)`,
    `grayscale(${adjustments.grayscale})`,
    `sepia(${adjustments.sepia})`,
    `invert(${adjustments.invert})`
  ].join(" ");
}

export function applyPreviewFilters(stage) {
  if (!stage) {
    return;
  }

  const filter = buildFilterString();

  stage.querySelectorAll("img").forEach((img) => {
    img.style.filter = filter;
  });
}

export function applyCanvasFilters(ctx) {
  if (!ctx || !("filter" in ctx)) {
    return;
  }

  ctx.filter = buildFilterString();
}

export function setAdjustment(key, value, stage) {
  if (!(key in adjustments)) {
    return;
  }

  const config = CONTROL_CONFIG[key];

  const nextValue = clamp(
    Number(value),
    config.min,
    config.max
  );

  adjustments[key] = nextValue;

  const ref = controlRefs[key];

  if (ref) {
    ref.input.value = String(nextValue);
    ref.valueLabel.textContent =
      formatControlValue(key, nextValue);
  }

  applyPreviewFilters(stage);
}

export function setAdjustments(values, stage) {
  Object.entries(values).forEach(([key, value]) => {
    if (key in adjustments) {
      adjustments[key] = value;
    }
  });

  syncControls();
  applyPreviewFilters(stage);
}

export function resetAdjustments(stage) {
  setAdjustments(DEFAULT_ADJUSTMENTS, stage);
}

export function applyPreset(name, stage) {
  const preset = PRESETS[name];

  if (!preset) {
    return;
  }

  setAdjustments(preset, stage);
}

export function syncControls() {
  Object.entries(controlRefs).forEach(([key, ref]) => {
    ref.input.value = adjustments[key];

    ref.valueLabel.textContent =
      formatControlValue(key, adjustments[key]);
  });
}

export function exportFilterState() {
  return {
    ...adjustments
  };
}

export function importFilterState(state, stage) {
  if (!state) {
    return;
  }

  Object.entries(DEFAULT_ADJUSTMENTS).forEach(([key, value]) => {
    adjustments[key] =
      key in state ? state[key] : value;
  });

  syncControls();
  applyPreviewFilters(stage);
}