import "../../../css/ui/Tooltip.css";
import { createElement } from "../createElement.js"; // Adjust path as needed

// ---- Types & Interfaces ----

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipOptions {
  trigger?: string | HTMLElement;
  position?: TooltipPosition;
}

/**
 * Creates an accessible Tooltip component.
 */
const Tooltip = (
  text: string,
  { trigger = "?", position = "top" }: TooltipOptions = {}
): HTMLDivElement => {
  const tooltip = createElement(
    "span",
    { class: `tooltip tooltip-${position}` },
    [text]
  );

  const wrapper = createElement(
    "div",
    {
      class: "tooltip-wrapper",
      tabindex: "0",
      role: "tooltip",
    },
    [trigger, tooltip]
  ) as HTMLDivElement;

  return wrapper;
};

export default Tooltip;