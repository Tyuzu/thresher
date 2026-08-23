import Cropper from "cropperjs";

export interface CropDimension {
  width: number;
  height: number;
}

export type CropPresetType = "avatar" | "banner";

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hueRotate: number;
  grayscale: number;
  sepia: number;
  invert: number;
}

export type AdjustmentKey = keyof Adjustments;

export interface ControlConfigItem {
  min: number;
  max: number;
  step: number;
  unit: "x" | "px" | "deg" | "%";
}

export interface ToolbarButtons {
  rotateLeft: HTMLButtonElement;
  rotateRight: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
  zoomIn: HTMLButtonElement;
  reset: HTMLButtonElement;
  confirm: HTMLButtonElement;
  cancel: HTMLButtonElement;
}

export interface ControlRegistration {
  input: HTMLInputElement;
  valueLabel: HTMLElement;
  minusButton: HTMLButtonElement | null;
  plusButton: HTMLButtonElement | null;
}

export interface IFilterManager {
  adjustments: Adjustments;
  setStage(stage: HTMLElement): void;
  formatControlValue(key: AdjustmentKey, value: number): string;
  registerControl(key: AdjustmentKey, controls: ControlRegistration): void;
  setAdjustment(key: AdjustmentKey, value: number | string): void;
  applyPreset(presetName: string): void;
  resetAdjustments(): void;
  applyPreviewFilters(): void;
  applyCanvasFilters(ctx: CanvasRenderingContext2D): void;
}

export interface CreateCropperOptions {
  image: HTMLImageElement;
  aspectRatio: number;
  cropTargetW: number;
  cropTargetH: number;
  onReady?: (cropper: Cropper) => void;
}

declare global {
  interface Window {
    Cropper?: typeof Cropper;
  }
}