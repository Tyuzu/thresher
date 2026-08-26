import Cropper from "cropperjs";
import { CreateCropperOptions } from "./types.js";

type CropperCompatInstance = {
  destroy?: () => void;
  crop?: () => void;
  rotate?: (angle: number) => void;
  zoom?: (scale: number) => void;
  reset?: () => void;
  getCroppedCanvas?: (options?: Record<string, unknown>) => HTMLCanvasElement | null;
  getContainerData?: () => { width: number; height: number };
  setCropBoxData?: (data: { left: number; top: number; width: number; height: number }) => void;
};

export function createCropper({
  image,
  aspectRatio,
  cropTargetW,
  cropTargetH,
  onReady
}: CreateCropperOptions): CropperCompatInstance {
  const CropperClass = (window as any).Cropper || (Cropper as any);

  if (!CropperClass) {
    throw new Error("CropperJS is not loaded.");
  }

  const cropperInstance = new CropperClass(image, {
    viewMode: 1,
    dragMode: "move",
    autoCrop: true,
    autoCropArea: 1,
    responsive: true,
    restore: true,
    modal: true,
    guides: false,
    center: true,
    background: false,
    movable: true,
    zoomable: true,
    rotatable: true,
    scalable: false,
    cropBoxResizable: false,
    cropBoxMovable: false,
    aspectRatio,

    ready(this: CropperCompatInstance) {
      try {
        centerCropBox(this, cropTargetW, cropTargetH);
        this.crop?.();
      } catch {
        try {
          this.crop?.();
        } catch {
          // noop
        }
      }

      onReady?.(this as any);
    }
  }) as CropperCompatInstance;

  return cropperInstance;
}

export function destroyCropper(cropper: CropperCompatInstance | null): void {
  cropper?.destroy?.();
}

export function rotateLeft(cropper: CropperCompatInstance | null): void {
  cropper?.rotate?.(-90);
}

export function rotateRight(cropper: CropperCompatInstance | null): void {
  cropper?.rotate?.(90);
}

export function zoomIn(cropper: CropperCompatInstance | null, amount = 0.1): void {
  cropper?.zoom?.(amount);
}

export function zoomOut(cropper: CropperCompatInstance | null, amount = 0.1): void {
  cropper?.zoom?.(-amount);
}

export function resizeCropper(cropper: CropperCompatInstance | null): void {
  if (!cropper) return;

  try {
    cropper.reset?.();
  } catch {
    // noop
  }
}

export function getCroppedCanvas(
  cropper: CropperCompatInstance | null,
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (!cropper) return null;

  return cropper.getCroppedCanvas?.({
    width,
    height,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  }) ?? null;
}

export function centerCropBox(
  cropper: CropperCompatInstance | null,
  cropTargetW: number,
  cropTargetH: number
): void {
  if (!cropper) return;

  const container = cropper.getContainerData?.();
  if (!container) return;

  const fitScale = Math.min(
    1,
    container.width / cropTargetW,
    container.height / cropTargetH
  );

  const cropWidth = cropTargetW * fitScale;
  const cropHeight = cropTargetH * fitScale;

  cropper.setCropBoxData?.({
    left: (container.width - cropWidth) / 2,
    top: (container.height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight
  });
}