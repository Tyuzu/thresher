import "../../../css/ui/ToggleSwitch.css";
import { createElement } from "../createElement.js"; // Adjust path as needed

// ---- Types & Interfaces ----

export interface ToggleSwitchOptions {
  checked?: boolean;
  id?: string;
  label?: string;
}

export type OnToggleCallback = (checked: boolean) => void;

/**
 * Creates an accessible ToggleSwitch component.
 */
const ToggleSwitch = (
  onToggle: OnToggleCallback,
  { checked = false, id = "", label = "" }: ToggleSwitchOptions = {}
): HTMLLabelElement => {
  const inputAttributes: Record<string, unknown> = {
    type: "checkbox",
    checked: Boolean(checked),
    "aria-label": label || "Toggle",
    events: {
      change: (e: Event) => {
        const target = e.target as HTMLInputElement;
        onToggle(target.checked);
      },
    },
  };

  if (id) {
    inputAttributes.id = id;
  }

  const input = createElement("input", inputAttributes);
  const slider = createElement("span", { class: "slider" });

  const labelAttributes: Record<string, unknown> = { class: "toggle-switch" };
  if (id) {
    labelAttributes.for = id;
  }

  const toggle = createElement(
    "label",
    labelAttributes,
    [input, slider]
  ) as HTMLLabelElement;

  return toggle;
};

export default ToggleSwitch;