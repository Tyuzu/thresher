import { IFilterManager } from "./types.js";

type CropperCompatInstance = {
  getCroppedCanvas?: (options?: Record<string, unknown>) => HTMLCanvasElement | null;
};

export interface ExportBlobOptions {
  cropper: CropperCompatInstance;
  cropWidth: number;
  cropHeight: number;
  filterManager?: IFilterManager | null;
  quality?: number;
}

export function toBlobAsync(
  canvas: HTMLCanvasElement,
  mimeType = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      mimeType,
      quality
    );
  });
}

export function exportWithFilters(
  croppedCanvas: HTMLCanvasElement,
  filterManager?: IFilterManager | null
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = croppedCanvas.width;
  canvas.height = croppedCanvas.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return croppedCanvas;

  ctx.save();
  if (filterManager && "filter" in ctx) {
    filterManager.applyCanvasFilters(ctx);
  }

  ctx.drawImage(croppedCanvas, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  return canvas;
}

export async function exportBlob({
  cropper,
  cropWidth,
  cropHeight,
  filterManager,
  quality = 0.92
}: ExportBlobOptions): Promise<Blob> {
  if (!cropper) {
    throw new Error("Cropper instance is missing.");
  }

  const canvas = cropper.getCroppedCanvas?.({
    width: cropWidth,
    height: cropHeight,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  }) ?? null;

  if (!canvas) {
    throw new Error("getCroppedCanvas returned null. Ensure image is loaded properly.");
  }

  const filteredCanvas = exportWithFilters(canvas, filterManager);
  const blob = await toBlobAsync(filteredCanvas, "image/jpeg", quality);

  // Prevent memory leaks on large canvas buffers
  canvas.width = 0;
  canvas.height = 0;
  filteredCanvas.width = 0;
  filteredCanvas.height = 0;

  return blob;
}