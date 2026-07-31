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
      class: `btn-control ${className}`.trim()
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
    class: `adjustment-group adjustment-${key}`
  });

  const header = createElement("div", {
    class: "adjustment-header"
  });

  const title = createElement(
    "strong",
    {
      class: "adjustment-title"
    },
    [label]
  );

  const valueLabel = createElement(
    "span",
    {
      class: "adjustment-value"
    },
    [formatControlValue(key, adjustments[key])]
  );

  header.append(title, valueLabel);

  const row = createElement("div", {
    class: "adjustment-row"
  });

  let minusButton = null;
  let plusButton = null;

  if (showStepButtons) {
    minusButton = makeButton(`btn-${key}-minus btn-step`, "－");
    plusButton = makeButton(`btn-${key}-plus btn-step`, "＋");

    row.appendChild(minusButton);
  }

  const input = createElement("input", {
    type: "range",
    min: cfg.min,
    max: cfg.max,
    step: cfg.step,
    value: adjustments[key],
    class: "range-input"
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
    class: "preset-row"
  });

  Object.keys(PRESETS).forEach((name) => {
    const button = makeButton(
      `preset-${name} btn-preset`,
      name.charAt(0).toUpperCase() + name.slice(1)
    );

    button.addEventListener("click", () => {
      applyPreset(name, stage);
    });

    row.appendChild(button);
  });

  return row;
}

function createToolbar() {
  const toolbar = createElement("div", {
    class: "controls-toolbar"
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
    class: "controls-panel"
  });

  const { toolbar, buttons } = createToolbar();
  const presets = createPresetRow(stage);

  const grid = createElement("div", {
    class: "adjustment-grid"
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