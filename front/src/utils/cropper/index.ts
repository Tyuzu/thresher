import { ensureCropper } from "./loader.js";
import {
    buildUI,
    mountOverlay,
    lockBodyScroll,
    unlockBodyScroll,
    resizeStage,
    CropType
} from "./ui.js";
import { createControls } from "./controls.js";
import { FilterManager } from "./filters.js";
import {
    createCropper,
    destroyCropper,
    resizeCropper,
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
    type?: CropType;
}

export function openCropperWithCropperJSBoundedFixedBox({
    file,
    type = "avatar"
}: OpenCropperOptions): Promise<Blob | null> {
    return new Promise((resolve) => {
        let cropper: ReturnType<typeof createCropper> | null = null;
        let objectUrl: string | null = null;

        const previousOverflow = lockBodyScroll();
        const filterManager = new FilterManager();

        const controls = createControls(null, filterManager);
        const { overlay, stage, image, cropTargetW, cropTargetH, aspectRatio } = buildUI({
            file,
            type,
            controlsPanel: controls.panel
        });

        objectUrl = image.src;
        filterManager.setStage(stage);
        mountOverlay(overlay);

        function cleanup(): void {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKeyDown);

            unlockBodyScroll(previousOverflow);
            destroyCropper(cropper);

            if (objectUrl) URL.revokeObjectURL(objectUrl);
            overlay.parentNode?.removeChild(overlay);
        }

        const onResize = debounce(() => {
            resizeStage(stage, cropTargetW, cropTargetH);
            if (cropper) {
                resizeCropper(cropper); // Calls cropper.reset() internally
                centerCropBox(cropper, cropTargetW, cropTargetH);
            }
        }, 100);

        function onKeyDown(e: KeyboardEvent): void {
            if (e.key === "Escape") {
                e.preventDefault();
                cleanup();
                resolve(null);
            }
        }

        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKeyDown);

        const {
            rotateLeft: rotateLeftBtn,
            rotateRight: rotateRightBtn,
            zoomIn: zoomInBtn,
            zoomOut: zoomOutBtn,
            confirm: confirmBtn,
            cancel: cancelBtn
        } = controls.buttons;

        cancelBtn?.addEventListener("click", () => {
            cleanup();
            resolve(null);
        });

        (async () => {
            try {
                await ensureCropper();

                cropper = createCropper({
                    image,
                    aspectRatio,
                    cropTargetW,
                    cropTargetH,
                    onReady() {
                        filterManager.applyPreviewFilters();
                    }
                });
            } catch (err: unknown) {
                console.error("Failed to initialize cropper:", err);
                cleanup();
                resolve(null);
                return;
            }

            rotateLeftBtn?.addEventListener("click", () => rotateLeft(cropper));
            rotateRightBtn?.addEventListener("click", () => rotateRight(cropper));
            zoomInBtn?.addEventListener("click", () => zoomIn(cropper));
            zoomOutBtn?.addEventListener("click", () => zoomOut(cropper));

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
                } catch (err: unknown) {
                    console.error("Crop export failed:", err);
                    cleanup();
                    resolve(null);
                }
            });
        })();
    });
}

export { openCropperWithCropperJSBoundedFixedBox as openCropper };