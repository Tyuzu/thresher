// export.js
export function toBlobAsync(canvas, mimeType = "image/jpeg", quality = 0.92) {
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

export function exportWithFilters(croppedCanvas, filterManager) {
  const canvas = document.createElement("canvas");
  canvas.width = croppedCanvas.width;
  canvas.height = croppedCanvas.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return croppedCanvas;

  ctx.save();
  
  // Safely apply canvas filters if supported
  if (filterManager && "filter" in ctx) {
    filterManager.applyCanvasFilters(ctx);
  }
  
  ctx.drawImage(croppedCanvas, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  return canvas;
}

export async function exportBlob({ cropper, cropWidth, cropHeight, filterManager, quality = 0.92 }) {
  if (!cropper) throw new Error("Cropper instance is missing.");

  // Get cropped canvas from Cropper.js
  const canvas = cropper.getCroppedCanvas({
    width: cropWidth,
    height: cropHeight,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });

  if (!canvas) {
    throw new Error("getCroppedCanvas returned null. Ensure image is loaded properly.");
  }

  const filteredCanvas = exportWithFilters(canvas, filterManager);
  const blob = await toBlobAsync(filteredCanvas, "image/jpeg", quality);

  // Prevent memory leaks by zeroing canvas dimensions
  canvas.width = 0;
  canvas.height = 0;
  filteredCanvas.width = 0;
  filteredCanvas.height = 0;

  return blob;
}