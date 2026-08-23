import { createElement } from "../../components/createElement.js";
import { CONTROL_CONFIG, PRESETS } from "./constants.js";
import { AdjustmentKey, ToolbarButtons, ControlRegistration, IFilterManager } from "./types.js";

export interface AdjustmentControlOptions {
  key: AdjustmentKey;
  label: string;
  filterManager: IFilterManager;
  showStepButtons?: boolean;
  stepButtonDelta?: number;
}

export interface ControlsResult {
  panel: HTMLDivElement;
  buttons: ToolbarButtons;
}

function makeButton(className: string, text: string): HTMLButtonElement {
  return createElement("button", {
    type: "button",
    class: `btn-control ${className}`.trim()
  }, [text]) as HTMLButtonElement;
}

function createAdjustmentControl({
  key,
  label,
  filterManager,
  showStepButtons = false,
  stepButtonDelta = 0.05
}: AdjustmentControlOptions): HTMLDivElement {
  const cfg = CONTROL_CONFIG[key];
  const currentVal = filterManager.adjustments[key];

  const root = createElement("div", { class: `adjustment-group adjustment-${key}` }) as HTMLDivElement;
  const header = createElement("div", { class: "adjustment-header" });

  const title = createElement("strong", { class: "adjustment-title" }, [label]);
  const valueLabel = createElement(
    "span",
    { class: "adjustment-value" },
    [filterManager.formatControlValue(key, currentVal)]
  );

  header.append(title, valueLabel);
  const row = createElement("div", { class: "adjustment-row" });

  let minusButton: HTMLButtonElement | null = null;
  let plusButton: HTMLButtonElement | null = null;

  if (showStepButtons) {
    minusButton = makeButton(`btn-${key}-minus btn-step`, "－");
    plusButton = makeButton(`btn-${key}-plus btn-step`, "＋");
    row.appendChild(minusButton);
  }

  const input = createElement("input", {
    type: "range",
    min: String(cfg.min),
    max: String(cfg.max),
    step: String(cfg.step),
    value: String(currentVal),
    class: "range-input"
  }) as HTMLInputElement;

  row.appendChild(input);
  if (plusButton) row.appendChild(plusButton);

  root.append(header, row);

  filterManager.registerControl(key, { input, valueLabel, minusButton, plusButton });

  input.addEventListener("input", () => {
    filterManager.setAdjustment(key, input.value);
  });

  minusButton?.addEventListener("click", () => {
    filterManager.setAdjustment(key, filterManager.adjustments[key] - stepButtonDelta);
  });

  plusButton?.addEventListener("click", () => {
    filterManager.setAdjustment(key, filterManager.adjustments[key] + stepButtonDelta);
  });

  return root;
}

function createPresetRow(filterManager: IFilterManager): HTMLDivElement {
  const row = createElement("div", { class: "preset-row" }) as HTMLDivElement;

  Object.keys(PRESETS).forEach((name) => {
    const button = makeButton(
      `preset-${name} btn-preset`,
      name.charAt(0).toUpperCase() + name.slice(1)
    );
    button.addEventListener("click", () => filterManager.applyPreset(name));
    row.appendChild(button);
  });

  return row;
}

function createToolbar(filterManager: IFilterManager): { toolbar: HTMLDivElement; buttons: ToolbarButtons } {
  const toolbar = createElement("div", { class: "controls-toolbar" }) as HTMLDivElement;

  const buttons: ToolbarButtons = {
    rotateLeft: makeButton("rotate-left", "⟲"),
    rotateRight: makeButton("rotate-right", "⟳"),
    zoomOut: makeButton("zoom-out", "－"),
    zoomIn: makeButton("zoom-in", "＋"),
    reset: makeButton("reset-adjustments", "Reset Adjustments"),
    confirm: makeButton("confirm", "Crop & Upload"),
    cancel: makeButton("cancel", "Cancel")
  };

  buttons.reset.addEventListener("click", () => filterManager.resetAdjustments());
  Object.values(buttons).forEach((btn) => toolbar.appendChild(btn));

  return { toolbar, buttons };
}

export function createControls(
  _stage: HTMLElement | null,
  filterManager: IFilterManager
): ControlsResult {
  const panel = createElement("div", { class: "controls-panel" }) as HTMLDivElement;
  const { toolbar, buttons } = createToolbar(filterManager);
  const presets = createPresetRow(filterManager);
  const grid = createElement("div", { class: "adjustment-grid" }) as HTMLDivElement;

  const adjustmentKeys: Array<{ key: AdjustmentKey; label: string; showStepButtons?: boolean }> = [
    { key: "brightness", label: "Brightness", showStepButtons: true },
    { key: "contrast", label: "Contrast", showStepButtons: true },
    { key: "saturation", label: "Saturation" },
    { key: "blur", label: "Blur" },
    { key: "hueRotate", label: "Hue Rotate" },
    { key: "grayscale", label: "Grayscale" },
    { key: "sepia", label: "Sepia" },
    { key: "invert", label: "Invert" }
  ];

  adjustmentKeys.forEach((config) => {
    grid.appendChild(createAdjustmentControl({ ...config, filterManager }));
  });

  panel.append(toolbar, presets, grid);
  return { panel, buttons };
}