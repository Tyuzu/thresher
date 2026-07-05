// export.js

import { applyCanvasFilters } from "./filters.js";

export function toBlobAsync(
  canvas,
  mimeType = "image/jpeg",
  quality = 0.92
) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      mimeType,
      quality
    );
  });
}

export function exportWithFilters(croppedCanvas) {
  const canvas = document.createElement("canvas");

  canvas.width = croppedCanvas.width;
  canvas.height = croppedCanvas.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return croppedCanvas;
  }

  ctx.save();

  applyCanvasFilters(ctx);

  ctx.drawImage(
    croppedCanvas,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.restore();

  return canvas;
}

export async function exportBlob({
  cropper,
  cropWidth,
  cropHeight,
  quality = 0.92
}) {
  if (!cropper) {
    throw new Error("Cropper instance is missing.");
  }

  const canvas = cropper.getCroppedCanvas({
    width: cropWidth,
    height: cropHeight,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });

  if (!canvas) {
    throw new Error("Unable to create cropped canvas.");
  }

  const filteredCanvas = exportWithFilters(canvas);

  return await toBlobAsync(
    filteredCanvas,
    "image/jpeg",
    quality
  );
}