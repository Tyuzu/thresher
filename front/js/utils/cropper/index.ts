import { ensureCropper } from "./loader.js";
import { buildUI, mountOverlay, lockBodyScroll, unlockBodyScroll, resizeStage } from "./ui.js";
import { createControls } from "./controls.js";
import { FilterManager } from "./filters.js";
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
import { debounce } from "../../utils/deutils.js";

export interface OpenCropperOptions {
  file: File;
  type?: string;
}

export function openCropperWithCropperJSBoundedFixedBox({ file, type = "avatar" }: OpenCropperOptions): Promise<Blob | null> {
  return new Promise(async (resolve) => {
    let cropper: any = null;
    let objectUrl: string | null = null;

    const previousOverflow = lockBodyScroll();
    const filterManager = new FilterManager();

    // Build UI
    const controls = createControls(null, filterManager);
    const { overlay, stage, image, cropTargetW, cropTargetH, aspectRatio } = buildUI({
      file,
      type,
      controlsPanel: controls.panel
    });

    objectUrl = image.src;
    filterManager.setStage(stage);
    mountOverlay(overlay);

    function cleanup() {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);

      unlockBodyScroll(previousOverflow);
      destroyCropper(cropper);

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }

    const onResize = debounce(() => {
      resizeStage(stage, cropTargetW, cropTargetH);
      if (cropper) {
        cropper.resize();
        centerCropBox(cropper, cropTargetW, cropTargetH);
      }
    }, 100);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
        resolve(null);
      }
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);

    try {
      await ensureCropper();
    } catch (err) {
      console.error(err);
      cleanup();
      resolve(null);
      return;
    }

    const {
      rotateLeft: rotateLeftBtn,
      rotateRight: rotateRightBtn,
      zoomIn: zoomInBtn,
      zoomOut: zoomOutBtn,
      confirm: confirmBtn,
      cancel: cancelBtn
    } = controls.buttons;

    // Attach non-cropper dependent events immediately
    cancelBtn?.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });

    try {
      cropper = createCropper({
        image,
        aspectRatio,
        cropTargetW,
        cropTargetH,
        onReady() {
          filterManager.applyPreviewFilters();
        }
      });
    } catch (err) {
      console.error(err);
      cleanup();
      resolve(null);
      return;
    }

    // Attach toolbar actions checking for valid cropper instance
    rotateLeftBtn?.addEventListener("click", () => {
      if (cropper) rotateLeft(cropper);
    });

    rotateRightBtn?.addEventListener("click", () => {
      if (cropper) rotateRight(cropper);
    });

    zoomInBtn?.addEventListener("click", () => {
      if (cropper) zoomIn(cropper);
    });

    zoomOutBtn?.addEventListener("click", () => {
      if (cropper) zoomOut(cropper);
    });

    confirmBtn?.addEventListener("click", async () => {
      if (!cropper) return;
      try {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const blob = await exportBlob({
          cropper,
          cropWidth: Math.round(cropTargetW * dpr),
          cropHeight: Math.round(cropTargetH * dpr),
          filterManager,
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

// function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
//   let timeout: number | undefined;
//   return function (this: any, ...args: Parameters<T>) {
//     if (timeout) clearTimeout(timeout);
//     timeout = window.setTimeout(() => func.apply(this, args), wait);
//   };
// }

export { openCropperWithCropperJSBoundedFixedBox as openCropper };