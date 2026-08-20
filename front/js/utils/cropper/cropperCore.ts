// cropperCore.js

export function createCropper({
  image,
  aspectRatio,
  cropTargetW,
  cropTargetH,
  onReady
}) {
  if (!window.Cropper) {
    throw new Error("CropperJS is not loaded.");
  }

  const cropper = new window.Cropper(image, {
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

ready() {
      try {
        centerCropBox(this, cropTargetW, cropTargetH);
        this.crop();
      } catch {
        try { this.crop(); } catch {}
      }

      if (typeof onReady === "function") {
        onReady(this);
      }
    }
  });

  return cropper;
}

export function destroyCropper(cropper) {
  if (!cropper) {
return;
}

  try {
    cropper.destroy();
  } catch (_) {}
}

export function rotateLeft(cropper) {
  if (cropper) {
    cropper.rotate(-90);
  }
}

export function rotateRight(cropper) {
  if (cropper) {
    cropper.rotate(90);
  }
}

export function zoomIn(cropper, amount = 0.1) {
  if (cropper) {
    cropper.zoom(amount);
  }
}

export function zoomOut(cropper, amount = 0.1) {
  if (cropper) {
    cropper.zoom(-amount);
  }
}

export function resizeCropper(cropper) {
  if (!cropper) {
return;
}

  try {
    cropper.resize();
  } catch (_) {}
}

export function getCroppedCanvas(
  cropper,
  width,
  height
) {
  if (!cropper) {
return null;
}

  return cropper.getCroppedCanvas({
    width,
    height,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high"
  });
}

// cropperCore.js

export function centerCropBox(cropper, cropTargetW, cropTargetH) {
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