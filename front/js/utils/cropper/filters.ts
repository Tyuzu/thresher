import { Adjustments, AdjustmentKey, ControlRegistration, IFilterManager } from "./types.js";
import { DEFAULT_ADJUSTMENTS, CONTROL_CONFIG, PRESETS } from "./constants.js";

export class FilterManager implements IFilterManager {
  public adjustments: Adjustments = { ...DEFAULT_ADJUSTMENTS };
  private stage: HTMLElement | null = null;
  private controls = new Map<AdjustmentKey, ControlRegistration>();

  public setStage(stage: HTMLElement): void {
    this.stage = stage;
  }

  public registerControl(key: AdjustmentKey, controls: ControlRegistration): void {
    this.controls.set(key, controls);
  }

  public formatControlValue(key: AdjustmentKey, value: number): string {
    const config = CONTROL_CONFIG[key];
    if (config.unit === "%") return `${Math.round(value * 100)}%`;
    if (config.unit === "deg") return `${Math.round(value)}°`;
    return `${value.toFixed(2)}${config.unit}`;
  }

  public setAdjustment(key: AdjustmentKey, value: number | string): void {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    this.adjustments[key] = numericValue;
    
    const reg = this.controls.get(key);
    if (reg) {
      reg.input.value = String(numericValue);
      reg.valueLabel.textContent = this.formatControlValue(key, numericValue);
    }
    this.applyPreviewFilters();
  }

  public applyPreset(presetName: string): void {
    const preset = PRESETS[presetName];
    if (!preset) return;
    (Object.keys(preset) as AdjustmentKey[]).forEach((key) => {
      this.setAdjustment(key, preset[key]);
    });
  }

  public resetAdjustments(): void {
    (Object.keys(DEFAULT_ADJUSTMENTS) as AdjustmentKey[]).forEach((key) => {
      this.setAdjustment(key, DEFAULT_ADJUSTMENTS[key]);
    });
  }

  public getFilterString(): string {
    const a = this.adjustments;
    return `brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturation}) blur(${a.blur}px) hue-rotate(${a.hueRotate}deg) grayscale(${a.grayscale}) sepia(${a.sepia}) invert(${a.invert})`;
  }

  public applyPreviewFilters(): void {
    if (!this.stage) return;
    const imgWrapper = this.stage.querySelector<HTMLElement>(".cropper-container");
    if (imgWrapper) {
      imgWrapper.style.filter = this.getFilterString();
    }
  }

  public applyCanvasFilters(ctx: CanvasRenderingContext2D): void {
    ctx.filter = this.getFilterString();
  }
}