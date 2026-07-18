// index.js

import { ensureCropper, getAddedAssets } from "./loader.js";
import { buildUI, mountOverlay, lockBodyScroll, unlockBodyScroll, resizeStage } from "./ui.js";
import { createControls } from "./controls.js";
import { applyPreviewFilters } from "./filters.js";
import {
  createCropper,
  destroyCropper,
  rotateLeft,
  rotateRight,
  zoomIn,
  zoomOut,
  centerCropBox
} from "./cropperCore.js";
import { exportBlob } from "./export.js";

export function openCropperWithCropperJSBoundedFixedBox({
  file,
  type = "avatar"
}) {
  return new Promise(async (resolve) => {

    let cropper = null;
    let objectUrl = null;

    const previousOverflow = lockBodyScroll();

    //
    // Build UI
    //

    const controls = createControls(null);

    const { overlay, _wrapper, stage, image, cropTargetW, cropTargetH, aspectRatio } = buildUI({ file, type, controlsPanel: controls.panel });

    objectUrl = image.src;

    mountOverlay(overlay);

    //
    // Cleanup
    //

    function cleanup() {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);

      unlockBodyScroll(previousOverflow);
      destroyCropper(cropper);

      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) { }
      }

      const assets = getAddedAssets();

      if (assets.script && assets.script.parentNode) {
        assets.script.parentNode.removeChild(assets.script);
      }

      if (assets.link && assets.link.parentNode) {
        assets.link.parentNode.removeChild(assets.link);
      }

      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }

    //
    // Window handlers
    //

    // Debounce the resize handler by 100ms
    const onResize = debounce(() => {
      resizeStage(stage, cropTargetW, cropTargetH);
      if (cropper) {
        cropper.resize();
        // Recalculate crop box center after resize is done
        centerCropBox(cropper, cropTargetW, cropTargetH);
      }
    }, 100);


    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
        resolve(null);
      }
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);

    //
    // Load CropperJS
    //

    try {
      await ensureCropper();
    } catch (err) {
      console.error(err);
      cleanup();
      resolve(null);
      return;
    }

    //
    // Create Cropper
    //

    try {
      cropper = createCropper({
        image,
        aspectRatio,
        cropTargetW,
        cropTargetH,
        onReady() {
          applyPreviewFilters(stage);
        }
      });
    } catch (err) {
      console.error(err);
      cleanup();
      resolve(null);
      return;
    }

    //
    // Toolbar buttons
    //

    const {
      rotateLeft: rotateLeftBtn,
      rotateRight: rotateRightBtn,
      zoomIn: zoomInBtn,
      zoomOut: zoomOutBtn,
      confirm: confirmBtn,
      cancel: cancelBtn
    } = controls.buttons;

    rotateLeftBtn.addEventListener("click", () => rotateLeft(cropper));
    rotateRightBtn.addEventListener("click", () => rotateRight(cropper));
    zoomInBtn.addEventListener("click", () => zoomIn(cropper));
    zoomOutBtn.addEventListener("click", () => zoomOut(cropper));

    //
    // Cancel
    //
    cancelBtn.addEventListener("click", () => { cleanup(); resolve(null); });

    //
    // Confirm
    //
    confirmBtn.addEventListener("click", async () => {
      try {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const blob = await exportBlob({
          cropper,
          cropWidth: Math.round(cropTargetW * dpr),
          cropHeight: Math.round(cropTargetH * dpr),
          quality: 0.92
        });
        cleanup();
        resolve(blob);
      } catch (err) {
        console.error("Crop export failed:", err);
        cleanup();
        resolve(null);
      }
    });
  });
}

// Lightweight debounce utility
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export {
  openCropperWithCropperJSBoundedFixedBox as openCropper
};