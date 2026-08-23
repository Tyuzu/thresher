import { createElement } from "../../components/createElement.js";
import { CROP_SIZES } from "./constants.js";
import { CropPresetType } from "./types.js";

export type CropType = CropPresetType | (string & {});

export interface CropConfig {
  cropTargetW: number;
  cropTargetH: number;
  aspectRatio: number;
}

export interface StageSize {
  width: number;
  height: number;
}

export interface ImageCreationResult {
  image: HTMLImageElement;
  objectUrl: string;
}

export interface BuildUIOptions {
  file: File | Blob;
  type?: CropType;
  controlsPanel?: HTMLElement | null;
}

export interface BuildUIResult {
  overlay: HTMLElement;
  wrapper: HTMLElement;
  stage: HTMLElement;
  image: HTMLImageElement;
  objectUrl: string;
  cropTargetW: number;
  cropTargetH: number;
  aspectRatio: number;
}

export function getCropConfig(type: CropType = "avatar"): CropConfig {
  const config = CROP_SIZES[type as CropPresetType] || CROP_SIZES.avatar;
  return {
    cropTargetW: config.width,
    cropTargetH: config.height,
    aspectRatio: config.width / config.height
  };
}

export function getStageSize(cropTargetW: number, cropTargetH: number): StageSize {
  const viewportW = Math.max(600, Math.min(window.innerWidth * 0.9, 1200));
  const viewportH = Math.max(420, Math.min(window.innerHeight * 0.8, 900));

  return {
    width: Math.max(viewportW, cropTargetW * 1.15),
    height: Math.max(viewportH, cropTargetH * 1.15)
  };
}

export function createOverlay(): HTMLElement {
  return createElement("div", {
    class: "crop-overlay",
    style: `
      position:fixed;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      background:rgba(0,0,0,.65);
      z-index:10000;
      padding:12px;
      box-sizing:border-box;
    `
  });
}

export function createStage(cropTargetW: number, cropTargetH: number): HTMLElement {
  const size = getStageSize(cropTargetW, cropTargetH);
  return createElement("div", {
    class: "crop-stage",
    style: `
      width:${size.width}px;
      height:${size.height}px;
      max-width:95vw;
      max-height:90vh;
      background:#111;
      position:relative;
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:8px;
    `
  });
}

export function createWrapper(): HTMLElement {
  return createElement("div", {
    class: "crop-wrapper",
    style: `
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:10px;
      max-width:96vw;
      max-height:94vh;
      overflow:auto;
    `
  });
}

export function createImage(file: File | Blob): ImageCreationResult {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.src = objectUrl;
  image.alt = "Crop image";
  image.draggable = false;
  image.style.display = "block";
  image.style.maxWidth = "100%";
  image.style.maxHeight = "100%";
  image.style.userSelect = "none";
  image.style.willChange = "filter";

  return { image, objectUrl };
}

export function buildUI({ file, type = "avatar", controlsPanel }: BuildUIOptions): BuildUIResult {
  const { cropTargetW, cropTargetH, aspectRatio } = getCropConfig(type);

  const overlay = createOverlay();
  const wrapper = createWrapper();
  const stage = createStage(cropTargetW, cropTargetH);
  const { image, objectUrl } = createImage(file);

  stage.appendChild(image);
  wrapper.appendChild(stage);

  if (controlsPanel) wrapper.appendChild(controlsPanel);
  overlay.appendChild(wrapper);

  return {
    overlay,
    wrapper,
    stage,
    image,
    objectUrl,
    cropTargetW,
    cropTargetH,
    aspectRatio
  };
}

export function mountOverlay(overlay: HTMLElement): void {
  document.body.appendChild(overlay);
}

export function unmountOverlay(overlay: HTMLElement | null | undefined): void {
  overlay?.parentNode?.removeChild(overlay);
}

export function lockBodyScroll(): string {
  const previous = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return previous;
}

export function unlockBodyScroll(previous: string): void {
  document.body.style.overflow = previous;
}

export function resizeStage(stage: HTMLElement, cropTargetW: number, cropTargetH: number): void {
  const size = getStageSize(cropTargetW, cropTargetH);
  stage.style.width = `${size.width}px`;
  stage.style.height = `${size.height}px`;
}