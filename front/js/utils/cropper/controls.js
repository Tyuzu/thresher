// controls.js

import { createElement } from "../../components/createElement.js";

import {
  CONTROL_CONFIG,
  PRESETS
} from "./constants.js";

import {
  getAdjustments,
  registerControl,
  formatControlValue,
  setAdjustment,
  applyPreset,
  resetAdjustments
} from "./filters.js";

function makeButton(className, text) {
  return createElement(
    "button",
    {
      type: "button",
      class: className,
      style: `
        padding:8px 12px;
        border:0;
        border-radius:6px;
        background:#2a2a2a;
        color:#fff;
        cursor:pointer;
      `
    },
    [text]
  );
}

function createAdjustmentControl({
  key,
  label,
  stage,
  showStepButtons = false,
  stepButtonDelta = 0.05
}) {
  const adjustments = getAdjustments();
  const cfg = CONTROL_CONFIG[key];

  const root = createElement("div", {
    class: `adjustment-group adjustment-${key}`,
    style: `
      display:flex;
      flex-direction:column;
      gap:8px;
      padding:10px;
      border-radius:8px;
      background:rgba(255,255,255,.06);
      box-sizing:border-box;
    `
  });

  const header = createElement("div", {
    style: `
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
    `
  });

  const title = createElement(
    "strong",
    {
      style: "font-size:14px"
    },
    [label]
  );

  const valueLabel = createElement(
    "span",
    {
      style: "font-size:13px;opacity:.85"
    },
    [formatControlValue(key, adjustments[key])]
  );

  header.append(title, valueLabel);

  const row = createElement("div", {
    style: `
      display:flex;
      align-items:center;
      gap:8px;
    `
  });

  let minusButton = null;
  let plusButton = null;

  if (showStepButtons) {
    minusButton = makeButton(`btn-${key}-minus`, "－");
    plusButton = makeButton(`btn-${key}-plus`, "＋");

    minusButton.style.minWidth = "40px";
    plusButton.style.minWidth = "40px";

    row.appendChild(minusButton);
  }

  const input = createElement("input", {
    type: "range",
    min: cfg.min,
    max: cfg.max,
    step: cfg.step,
    value: adjustments[key],
    style: "width:100%;"
  });

  row.appendChild(input);

  if (plusButton) {
    row.appendChild(plusButton);
  }

  root.append(header, row);

  registerControl(key, {
    input,
    valueLabel,
    minusButton,
    plusButton
  });

  input.addEventListener("input", () => {
    setAdjustment(key, input.value, stage);
  });

  if (minusButton) {
    minusButton.addEventListener("click", () => {
      setAdjustment(
        key,
        adjustments[key] - stepButtonDelta,
        stage
      );
    });
  }

  if (plusButton) {
    plusButton.addEventListener("click", () => {
      setAdjustment(
        key,
        adjustments[key] + stepButtonDelta,
        stage
      );
    });
  }

  return root;
}

function createPresetRow(stage) {
  const row = createElement("div", {
    style: `
      display:flex;
      flex-wrap:wrap;
      justify-content:center;
      gap:8px;
    `
  });

  Object.keys(PRESETS).forEach((name) => {
    const button = makeButton(
      `preset-${name}`,
      name.charAt(0).toUpperCase() + name.slice(1)
    );

    button.style.background = "#1f3a5f";

    button.addEventListener("click", () => {
      applyPreset(name, stage);
    });

    row.appendChild(button);
  });

  return row;
}

function createToolbar() {
  const toolbar = createElement("div", {
    style: `
      display:flex;
      flex-wrap:wrap;
      justify-content:center;
      align-items:center;
      gap:8px;
    `
  });

  const buttons = {
    rotateLeft: makeButton("rotate-left", "⟲"),
    rotateRight: makeButton("rotate-right", "⟳"),
    zoomOut: makeButton("zoom-out", "－"),
    zoomIn: makeButton("zoom-in", "＋"),
    reset: makeButton("reset-adjustments", "Reset Adjustments"),
    confirm: makeButton("confirm", "Crop & Upload"),
    cancel: makeButton("cancel", "Cancel")
  };

  buttons.reset.addEventListener("click", () => {
    resetAdjustments();
  });

  Object.values(buttons).forEach((btn) => {
    toolbar.appendChild(btn);
  });

  return {
    toolbar,
    buttons
  };
}

export function createControls(stage) {
  const panel = createElement("div", {
    style: `
      display:flex;
      flex-direction:column;
      gap:10px;
      width:min(95vw,1200px);
      margin-top:12px;
      color:#fff;
      font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
      box-sizing:border-box;
    `
  });

  const { toolbar, buttons } = createToolbar();

  const presets = createPresetRow(stage);

  const grid = createElement("div", {
    style: `
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
      gap:10px;
      width:100%;
    `
  });

  grid.append(
    createAdjustmentControl({
      key: "brightness",
      label: "Brightness",
      stage,
      showStepButtons: true
    }),

    createAdjustmentControl({
      key: "contrast",
      label: "Contrast",
      stage,
      showStepButtons: true
    }),

    createAdjustmentControl({
      key: "saturation",
      label: "Saturation",
      stage
    }),

    createAdjustmentControl({
      key: "blur",
      label: "Blur",
      stage
    }),

    createAdjustmentControl({
      key: "hueRotate",
      label: "Hue Rotate",
      stage
    }),

    createAdjustmentControl({
      key: "grayscale",
      label: "Grayscale",
      stage
    }),

    createAdjustmentControl({
      key: "sepia",
      label: "Sepia",
      stage
    }),

    createAdjustmentControl({
      key: "invert",
      label: "Invert",
      stage
    })
  );

  panel.append(
    toolbar,
    presets,
    grid
  );

  return {
    panel,
    buttons
  };
}