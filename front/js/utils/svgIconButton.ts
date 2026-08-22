import { createElement } from "../components/createElement.js";

// ---- Types & Interfaces ----

export interface IconButtonProps {
  classSuffix?: string;
  svgMarkup: string;
  onClick?: (e: MouseEvent | KeyboardEvent) => void;
  label?: string;
  name?: string;
  id?: string;
  ariaLabel?: string;
}

export interface CleanableButtonElement extends HTMLDivElement {
  cleanup?: () => void;
}

/**
 * Creates an accessible custom icon button.
 */
export function createIconButton({
  classSuffix,
  svgMarkup,
  onClick,
  label = "",
  id = "",
  name = "",
  ariaLabel = "",
}: IconButtonProps): CleanableButtonElement {
  // Defensive validation for class strings
  const suffix = classSuffix ? ` ${classSuffix}` : "";

  // Render SVG safely wrapped in an isolated layout element
  const iconSpan = createElement("span", { class: "icon-wrapper" });
  if (svgMarkup) {
    iconSpan.innerHTML = svgMarkup;
  }

  // Create text label node if label exists
  const textSpan = label
    ? createElement("span", { class: "button-label" }, [label])
    : null;

  // Prepare event listeners if callback provided
  let clickHandler: ((e: MouseEvent) => void) | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  const events: Record<string, EventListener> = {};

  if (typeof onClick === "function") {
    clickHandler = (e: MouseEvent) => {
      e.preventDefault();
      onClick(e); // Pass the event object upstream
    };

    keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e); // Pass the event object upstream
      }
    };

    events.click = clickHandler as EventListener;
    events.keydown = keyHandler as EventListener;
  }

  // Construct button using createElement specification
  const button = createElement(
    "div",
    {
      class: `logoicon${suffix}`.trim(),
      id: id || undefined, // Dropped attribute if blank
      role: "button",
      "aria-label": ariaLabel || label || "Icon Button",
      tabindex: "0",
      events,
    },
    [iconSpan, textSpan]
  ) as CleanableButtonElement;

  // Attach clean reference layer to handle manual element dismounts
  if (clickHandler && keyHandler) {
    button.cleanup = () => {
      button.removeEventListener("click", clickHandler as EventListener);
      button.removeEventListener("keydown", keyHandler as EventListener);
    };
  }

  return button;
}