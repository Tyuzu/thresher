import { DEFAULT_ADJUSTMENTS, CONTROL_CONFIG, PRESETS } from "./constants.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class FilterManager {
  constructor() {
    this.adjustments = { ...DEFAULT_ADJUSTMENTS };
    this.controlRefs = {};
    this.stage = null;
  }

  setStage(stage) {
    this.stage = stage;
  }

  registerControl(key, refs) {
    this.controlRefs[key] = refs;
  }

  formatControlValue(key, value) {
    switch (key) {
      case "brightness":
      case "contrast":
      case "saturation":
      case "grayscale":
      case "sepia":
      case "invert":
        return `${Math.round(value * 100)}%`;
      case "blur":
        return `${Number(value).toFixed(1)}px`;
      case "hueRotate":
        return `${Math.round(value)}°`;
      default:
        return String(value);
    }
  }

  buildFilterString() {
    const adj = this.adjustments;
    return [
      `brightness(${adj.brightness})`,
      `contrast(${adj.contrast})`,
      `saturate(${adj.saturation})`,
      `blur(${adj.blur}px)`,
      `hue-rotate(${adj.hueRotate}deg)`,
      `grayscale(${adj.grayscale})`,
      `sepia(${adj.sepia})`,
      `invert(${adj.invert})`
    ].join(" ");
  }

  applyPreviewFilters() {
    if (!this.stage) return;
    const filter = this.buildFilterString();
    
    // Target main cropper image target explicitly rather than all dynamic images
    const cropperImage = this.stage.querySelector(".cropper-container .cropper-canvas img");
    if (cropperImage) {
      cropperImage.style.filter = filter;
    }
  }

  applyCanvasFilters(ctx) {
    if (ctx && "filter" in ctx) {
      ctx.filter = this.buildFilterString();
    }
  }

  setAdjustment(key, value) {
    if (!(key in this.adjustments)) return;

    const config = CONTROL_CONFIG[key];
    const nextValue = clamp(Number(value), config.min, config.max);
    this.adjustments[key] = nextValue;

    const ref = this.controlRefs[key];
    if (ref) {
      ref.input.value = String(nextValue);
      ref.valueLabel.textContent = this.formatControlValue(key, nextValue);
    }

    this.applyPreviewFilters();
  }

  setAdjustments(values) {
    Object.entries(values).forEach(([key, value]) => {
      if (key in this.adjustments) {
        this.adjustments[key] = value;
      }
    });

    this.syncControls();
    this.applyPreviewFilters();
  }

  resetAdjustments() {
    this.setAdjustments(DEFAULT_ADJUSTMENTS);
  }

  applyPreset(name) {
    const preset = PRESETS[name];
    if (preset) {
      this.setAdjustments(preset);
    }
  }

  syncControls() {
    Object.entries(this.controlRefs).forEach(([key, ref]) => {
      ref.input.value = String(this.adjustments[key]);
      ref.valueLabel.textContent = this.formatControlValue(key, this.adjustments[key]);
    });
  }
}