import "../../../css/ui/ToggleSwitch.css";
import { createElement } from "../createElement.ts"; // Adjust path as needed

const ToggleSwitch = (onToggle, { checked = false, id = "", label = "" } = {}) => {
  const inputAttributes = {
    type: "checkbox",
    checked: Boolean(checked),
    "aria-label": label || "Toggle",
    events: {
      change: (e) => onToggle(e.target.checked)
    }
  };

  if (id) {
    inputAttributes.id = id;
  }

  const input = createElement("input", inputAttributes);
  const slider = createElement("span", { class: "slider" });

  const labelAttributes = { class: "toggle-switch" };
  if (id) {
    labelAttributes.for = id;
  }

  const toggle = createElement("label", labelAttributes, [input, slider]);

  return toggle;
};

export default ToggleSwitch;