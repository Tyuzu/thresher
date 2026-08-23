import Cropper from "cropperjs";
import { CreateCropperOptions } from "./types.js";

export function createCropper({
  image,
  aspectRatio,
  cropTargetW,
  cropTargetH,
  onReady
}: CreateCropperOptions): Cropper {
  const CropperClass = window.Cropper || Cropper;

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

    ready(this: Cropper) {
      try {
        centerCropBox(this, cropTargetW, cropTargetH);
        this.crop();
      } catch {
        try {
          this.crop();
        } catch { /* noop */ }
      }

      onReady?.(this);
    }
  });

  return cropperInstance;
}

export function destroyCropper(cropper: Cropper | null): void {
  cropper?.destroy();
}

export function rotateLeft(cropper: Cropper | null): void {
  cropper?.rotate(-90);
}

export function rotateRight(cropper: Cropper | null): void {
  cropper?.rotate(90);
}

export function zoomIn(cropper: Cropper | null, amount = 0.1): void {
  cropper?.zoom(amount);
}

export function zoomOut(cropper: Cropper | null, amount = 0.1): void {
  cropper?.zoom(-amount);
}

export function resizeCropper(cropper: Cropper | null): void {
  if (!cropper) return;
  
  try {
    // In v1.5.13, reset() recalculates container dimensions and resets crop box
    cropper.reset();
  } catch (_) {}
}

export function getCroppedCanvas(
  cropper: Cropper | null,
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (!cropper) return null;

  return cropper.getCroppedCanvas({
    width,
    height,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });
}

export function centerCropBox(
  cropper: Cropper | null,
  cropTargetW: number,
  cropTargetH: number
): void {
  if (!cropper) return;

  const container = cropper.getContainerData();

  const fitScale = Math.min(
    1,
    container.width / cropTargetW,
    container.height / cropTargetH
  );

  const cropWidth = cropTargetW * fitScale;
  const cropHeight = cropTargetH * fitScale;

  cropper.setCropBoxData({
    left: (container.width - cropWidth) / 2,
    top: (container.height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight
  });
}