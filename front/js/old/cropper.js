import { createElement } from "../components/createElement.js";

export function openCropperWithCropperJSBoundedFixedBox({ file, type = "avatar" }) {
  return new Promise((resolve) => {
    const CROP_PERF_VERSION = "1.5.13";
    const JS_SRC = `https://unpkg.com/cropperjs@${CROP_PERF_VERSION}/dist/cropper.min.js`;
    const CSS_HREF = `https://unpkg.com/cropperjs@${CROP_PERF_VERSION}/dist/cropper.min.css`;

    let addedScript = null;
    let addedLink = null;
    let createdCropper = null;
    let objectUrl = null;
    let cleanup = null;

    const adjustments = {
      brightness: 1,
      contrast: 1,
      saturation: 1,
      blur: 0,
      hueRotate: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0
    };

    const CONTROL_CONFIG = {
      brightness: { min: 0.5, max: 1.8, step: 0.01, unit: "x" },
      contrast: { min: 0.5, max: 1.8, step: 0.01, unit: "x" },
      saturation: { min: 0, max: 2.5, step: 0.01, unit: "x" },
      blur: { min: 0, max: 8, step: 0.1, unit: "px" },
      hueRotate: { min: -180, max: 180, step: 1, unit: "deg" },
      grayscale: { min: 0, max: 1, step: 0.01, unit: "%" },
      sepia: { min: 0, max: 1, step: 0.01, unit: "%" },
      invert: { min: 0, max: 1, step: 0.01, unit: "%" }
    };

    const PRESETS = {
      normal: {
        brightness: 1,
        contrast: 1,
        saturation: 1,
        blur: 0,
        hueRotate: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0
      },
      warm: {
        brightness: 1.04,
        contrast: 1.06,
        saturation: 1.1,
        blur: 0,
        hueRotate: -8,
        grayscale: 0,
        sepia: 0.14,
        invert: 0
      },
      cool: {
        brightness: 0.99,
        contrast: 1.08,
        saturation: 1.05,
        blur: 0,
        hueRotate: 16,
        grayscale: 0,
        sepia: 0,
        invert: 0
      },
      mono: {
        brightness: 1,
        contrast: 1.1,
        saturation: 0,
        blur: 0,
        hueRotate: 0,
        grayscale: 1,
        sepia: 0,
        invert: 0
      },
      vintage: {
        brightness: 1.03,
        contrast: 0.95,
        saturation: 0.9,
        blur: 0,
        hueRotate: -12,
        grayscale: 0,
        sepia: 0.28,
        invert: 0
      },
      dramatic: {
        brightness: 0.96,
        contrast: 1.28,
        saturation: 1.08,
        blur: 0,
        hueRotate: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0
      }
    };

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function loadScript(src) {
      return new Promise((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (window.Cropper) {
            res(existing);
            return;
          }
          existing.addEventListener("load", () => res(existing), { once: true });
          existing.addEventListener("error", () => rej(new Error("Failed to load script")), { once: true });
          return;
        }

        const s = createElement("script", { src });
        s.async = true;
        s.addEventListener("load", () => res(s), { once: true });
        s.addEventListener("error", () => rej(new Error(`Failed to load script ${src}`)), { once: true });
        addedScript = s;
        document.head.appendChild(s);
      });
    }

    function loadCss(href) {
      return new Promise((res, rej) => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) {
          res(existing);
          return;
        }

        const l = createElement("link", { rel: "stylesheet", href });
        l.dataset.cropperCss = "1";
        l.addEventListener("load", () => res(l), { once: true });
        l.addEventListener("error", () => rej(new Error(`Failed to load css ${href}`)), { once: true });
        addedLink = l;
        document.head.appendChild(l);
      });
    }

    async function ensureCropper() {
      if (!window.Cropper) {
        await Promise.all([loadCss(CSS_HREF), loadScript(JS_SRC)]);
      } else {
        await loadCss(CSS_HREF);
      }
    }

    const overlay = createElement("div", {
      class: "crop-overlay",
      style: `
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.65);
        z-index: 10000;
        padding: 12px;
        box-sizing: border-box;
      `
    });

    const cropTargetW = type === "banner" ? 700 : 300;
    const cropTargetH = type === "banner" ? 300 : 300;
    const aspectRatio = cropTargetW / cropTargetH;

    function getStageSize() {
      const viewportW = Math.max(600, Math.min(window.innerWidth * 0.9, 1200));
      const viewportH = Math.max(420, Math.min(window.innerHeight * 0.8, 900));
      return {
        width: Math.max(viewportW, cropTargetW * 1.15),
        height: Math.max(viewportH, cropTargetH * 1.15)
      };
    }

    const initialStageSize = getStageSize();

    const stage = createElement("div", {
      class: "crop-stage",
      style: `
        width: ${initialStageSize.width}px;
        height: ${initialStageSize.height}px;
        max-width: 95vw;
        max-height: 90vh;
        background: #111;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
      `
    });

    const img = new Image();
    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.alt = "Crop image";
    img.draggable = false;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.display = "block";
    img.style.userSelect = "none";
    img.style.willChange = "filter";

    stage.appendChild(img);

    const controlsPanel = createElement("div", {
      class: "crop-controls-panel",
      style: `
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(95vw, 1200px);
        margin-top: 12px;
        color: #fff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-sizing: border-box;
      `
    });

    const topToolbar = createElement("div", {
      class: "crop-toolbar",
      style: `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
      `
    });

    function makeButton(className, text) {
      return createElement("button", {
        type: "button",
        class: className,
        style: `
          padding: 8px 12px;
          border: 0;
          border-radius: 6px;
          background: #2a2a2a;
          color: #fff;
          cursor: pointer;
        `
      }, [text]);
    }

    const rotateLeft = makeButton("btn-rotate-left", "⟲");
    const rotateRight = makeButton("btn-rotate-right", "⟳");
    const zoomOut = makeButton("btn-zoom-out", "－");
    const zoomIn = makeButton("btn-zoom-in", "＋");
    const resetAdjustmentsBtn = makeButton("btn-reset-adjustments", "Reset Adjustments");
    const confirmBtn = makeButton("btn-confirm", "Crop & Upload");
    const cancelBtn = makeButton("btn-cancel", "Cancel");

    topToolbar.appendChild(rotateLeft);
    topToolbar.appendChild(rotateRight);
    topToolbar.appendChild(zoomOut);
    topToolbar.appendChild(zoomIn);
    topToolbar.appendChild(resetAdjustmentsBtn);
    topToolbar.appendChild(confirmBtn);
    topToolbar.appendChild(cancelBtn);

    const presetRow = createElement("div", {
      class: "crop-preset-row",
      style: `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
      `
    });

    function makePresetButton(key, text) {
      const btn = makeButton(`btn-preset-${key}`, text);
      btn.style.background = "#1f3a5f";
      return btn;
    }

    const presetNormal = makePresetButton("normal", "Normal");
    const presetWarm = makePresetButton("warm", "Warm");
    const presetCool = makePresetButton("cool", "Cool");
    const presetMono = makePresetButton("mono", "Mono");
    const presetVintage = makePresetButton("vintage", "Vintage");
    const presetDramatic = makePresetButton("dramatic", "Dramatic");

    presetRow.appendChild(presetNormal);
    presetRow.appendChild(presetWarm);
    presetRow.appendChild(presetCool);
    presetRow.appendChild(presetMono);
    presetRow.appendChild(presetVintage);
    presetRow.appendChild(presetDramatic);

    const adjustmentsGrid = createElement("div", {
      class: "crop-adjustments-grid",
      style: `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 10px;
        width: 100%;
      `
    });

    const controlRefs = {};

    function formatControlValue(key, value) {
      if (key === "brightness" || key === "contrast" || key === "saturation") {
        return `${Math.round(value * 100)}%`;
      }

      if (key === "blur") {
        return `${value.toFixed(1)}px`;
      }

      if (key === "hueRotate") {
        return `${Math.round(value)}°`;
      }

      if (key === "grayscale" || key === "sepia" || key === "invert") {
        return `${Math.round(value * 100)}%`;
      }

      return String(value);
    }

    function buildFilterString() {
      return [
        `brightness(${adjustments.brightness})`,
        `contrast(${adjustments.contrast})`,
        `saturate(${adjustments.saturation})`,
        `blur(${adjustments.blur}px)`,
        `hue-rotate(${adjustments.hueRotate}deg)`,
        `grayscale(${adjustments.grayscale})`,
        `sepia(${adjustments.sepia})`,
        `invert(${adjustments.invert})`
      ].join(" ");
    }

    function applyPreviewFilters() {
      const filterString = buildFilterString();
      const images = stage.querySelectorAll("img");

      images.forEach((node) => {
        node.style.filter = filterString;
      });
    }

    function setAdjustment(key, value) {
      if (!(key in adjustments)) {
        return;
      }

      const cfg = CONTROL_CONFIG[key];
      const nextValue = clamp(Number(value), cfg.min, cfg.max);
      adjustments[key] = nextValue;

      const ref = controlRefs[key];
      if (ref) {
        ref.input.value = String(nextValue);
        ref.valueLabel.textContent = formatControlValue(key, nextValue);
      }

      applyPreviewFilters();
    }

    function applyPreset(presetKey) {
      const preset = PRESETS[presetKey];
      if (!preset) {
        return;
      }

      Object.keys(adjustments).forEach((key) => {
        if (key in preset) {
          adjustments[key] = preset[key];
        }
      });

      Object.keys(controlRefs).forEach((key) => {
        const ref = controlRefs[key];
        ref.input.value = String(adjustments[key]);
        ref.valueLabel.textContent = formatControlValue(key, adjustments[key]);
      });

      applyPreviewFilters();
    }

    function createAdjustmentControl({ key, label, showStepButtons = false, stepButtonDelta = 0.05 }) {
      const cfg = CONTROL_CONFIG[key];

      const root = createElement("div", {
        class: `adjustment-group adjustment-${key}`,
        style: `
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          box-sizing: border-box;
        `
      });

      const header = createElement("div", {
        class: "adjustment-header",
        style: `
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        `
      });

      const title = createElement("strong", {
        style: "font-size: 14px;"
      }, [label]);

      const valueLabel = createElement("span", {
        class: `adjustment-value adjustment-value-${key}`,
        style: "font-size: 13px; opacity: 0.9;"
      }, [formatControlValue(key, adjustments[key])]);

      header.appendChild(title);
      header.appendChild(valueLabel);

      const sliderRow = createElement("div", {
        class: "adjustment-slider-row",
        style: `
          display: flex;
          align-items: center;
          gap: 8px;
        `
      });

      let minusButton = null;
      let plusButton = null;

      if (showStepButtons) {
        minusButton = makeButton(`btn-${key}-decrease`, "－");
        plusButton = makeButton(`btn-${key}-increase`, "＋");
        minusButton.style.minWidth = "40px";
        plusButton.style.minWidth = "40px";
      }

      const input = createElement("input", {
        type: "range",
        min: String(cfg.min),
        max: String(cfg.max),
        step: String(cfg.step),
        value: String(adjustments[key]),
        class: `adjustment-slider adjustment-slider-${key}`,
        style: "width: 100%;"
      });

      if (minusButton) {
        sliderRow.appendChild(minusButton);
      }

      sliderRow.appendChild(input);

      if (plusButton) {
        sliderRow.appendChild(plusButton);
      }

      root.appendChild(header);
      root.appendChild(sliderRow);

      controlRefs[key] = {
        input,
        valueLabel,
        minusButton,
        plusButton
      };

      input.addEventListener("input", () => {
        setAdjustment(key, input.value);
      });

      if (minusButton && plusButton) {
        minusButton.addEventListener("click", () => {
          setAdjustment(key, Number(adjustments[key]) - stepButtonDelta);
        });

        plusButton.addEventListener("click", () => {
          setAdjustment(key, Number(adjustments[key]) + stepButtonDelta);
        });
      }

      return root;
    }

    const brightnessControl = createAdjustmentControl({
      key: "brightness",
      label: "Brightness",
      showStepButtons: true,
      stepButtonDelta: 0.05
    });

    const contrastControl = createAdjustmentControl({
      key: "contrast",
      label: "Contrast",
      showStepButtons: true,
      stepButtonDelta: 0.05
    });

    const saturationControl = createAdjustmentControl({
      key: "saturation",
      label: "Saturation"
    });

    const blurControl = createAdjustmentControl({
      key: "blur",
      label: "Blur"
    });

    const hueControl = createAdjustmentControl({
      key: "hueRotate",
      label: "Hue Rotate"
    });

    const grayscaleControl = createAdjustmentControl({
      key: "grayscale",
      label: "Grayscale"
    });

    const sepiaControl = createAdjustmentControl({
      key: "sepia",
      label: "Sepia"
    });

    const invertControl = createAdjustmentControl({
      key: "invert",
      label: "Invert"
    });

    adjustmentsGrid.appendChild(brightnessControl);
    adjustmentsGrid.appendChild(contrastControl);
    adjustmentsGrid.appendChild(saturationControl);
    adjustmentsGrid.appendChild(blurControl);
    adjustmentsGrid.appendChild(hueControl);
    adjustmentsGrid.appendChild(grayscaleControl);
    adjustmentsGrid.appendChild(sepiaControl);
    adjustmentsGrid.appendChild(invertControl);

    controlsPanel.appendChild(topToolbar);
    controlsPanel.appendChild(presetRow);
    controlsPanel.appendChild(adjustmentsGrid);

    const wrapper = createElement("div", {
      class: "crop-wrapper",
      style: `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        max-width: 96vw;
        max-height: 94vh;
        overflow: auto;
      `
    });

    wrapper.appendChild(stage);
    wrapper.appendChild(controlsPanel);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function toBlobAsync(canvas, mimeType, quality) {
      return new Promise((res) => {
        canvas.toBlob((blob) => res(blob), mimeType, quality);
      });
    }

    function exportWithFilters(croppedCanvas) {
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = croppedCanvas.width;
      finalCanvas.height = croppedCanvas.height;

      const ctx = finalCanvas.getContext("2d");
      if (!ctx) {
        return croppedCanvas;
      }

      ctx.save();
      if ("filter" in ctx) {
        ctx.filter = buildFilterString();
      }
      ctx.drawImage(croppedCanvas, 0, 0);
      ctx.restore();

      return finalCanvas;
    }

    function removeWindowListeners() {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("keydown", onKeyDown);
    }

    function performCleanup() {
      removeWindowListeners();
      document.body.style.overflow = previousBodyOverflow;

      try {
        if (createdCropper) {
          createdCropper.destroy();
          createdCropper = null;
        }
      } catch (err) {
        // ignore
      }

      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (err) {
          // ignore
        }
        objectUrl = null;
      }

      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      try {
        if (addedScript && addedScript.parentNode) {
          addedScript.parentNode.removeChild(addedScript);
          addedScript = null;
        }
        if (addedLink && addedLink.parentNode) {
          addedLink.parentNode.removeChild(addedLink);
          addedLink = null;
        }
      } catch (err) {
        // ignore
      }
    }

    cleanup = performCleanup;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelBtn.click();
      }
    }

    function onWindowResize() {
      const nextSize = getStageSize();
      stage.style.width = `${nextSize.width}px`;
      stage.style.height = `${nextSize.height}px`;

      if (createdCropper) {
        createdCropper.resize();
      }
    }

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("keydown", onKeyDown);

    applyPreviewFilters();

    ensureCropper()
      .then(() => {
        try {
          createdCropper = new window.Cropper(img, {
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
            aspectRatio,
            cropBoxResizable: false,
            cropBoxMovable: false,
            ready() {
              try {
                const containerData = this.getContainerData();
                const fitScale = Math.min(1, containerData.width / cropTargetW, containerData.height / cropTargetH);
                const boxW = cropTargetW * fitScale;
                const boxH = cropTargetH * fitScale;
                const left = (containerData.width - boxW) / 2;
                const top = (containerData.height - boxH) / 2;

                this.setCropBoxData({
                  left,
                  top,
                  width: boxW,
                  height: boxH
                });

                this.crop();
              } catch (err) {
                try {
                  this.crop();
                } catch (e) {
                  // ignore
                }
              }

              applyPreviewFilters();
            }
          });

          rotateLeft.addEventListener("click", () => {
            createdCropper.rotate(-90);
          });

          rotateRight.addEventListener("click", () => {
            createdCropper.rotate(90);
          });

          zoomIn.addEventListener("click", () => {
            createdCropper.zoom(0.1);
          });

          zoomOut.addEventListener("click", () => {
            createdCropper.zoom(-0.1);
          });

          resetAdjustmentsBtn.addEventListener("click", () => {
            applyPreset("normal");
          });

          presetNormal.addEventListener("click", () => {
            applyPreset("normal");
          });

          presetWarm.addEventListener("click", () => {
            applyPreset("warm");
          });

          presetCool.addEventListener("click", () => {
            applyPreset("cool");
          });

          presetMono.addEventListener("click", () => {
            applyPreset("mono");
          });

          presetVintage.addEventListener("click", () => {
            applyPreset("vintage");
          });

          presetDramatic.addEventListener("click", () => {
            applyPreset("dramatic");
          });

          cancelBtn.addEventListener("click", () => {
            cleanup();
            resolve(null);
          });

          confirmBtn.addEventListener("click", async () => {
            try {
              const dpr = Math.max(1, window.devicePixelRatio || 1);
              const outW = Math.round(cropTargetW * dpr);
              const outH = Math.round(cropTargetH * dpr);

              const croppedCanvas = createdCropper.getCroppedCanvas({
                width: outW,
                height: outH,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: "high"
              });

              if (!croppedCanvas) {
                throw new Error("Cropped canvas not available");
              }

              const finalCanvas = exportWithFilters(croppedCanvas);
              const blob = await toBlobAsync(finalCanvas, "image/jpeg", 0.92);

              cleanup();
              resolve(blob);
            } catch (err) {
              console.error("Crop export failed:", err);
              cleanup();
              resolve(null);
            }
          });
        } catch (err) {
          console.error("Failed to init Cropper:", err);
          cleanup();
          resolve(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load Cropper assets:", err);
        cleanup();
        resolve(null);
      });
  });
}

export { openCropperWithCropperJSBoundedFixedBox as openCropper };