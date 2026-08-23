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
  ariaLabel = "",
}: IconButtonProps): CleanableButtonElement {
  // Defensive validation for class strings
  const suffix = classSuffix ? ` ${classSuffix}` : "";

  // Render SVG safely wrapped in an isolated layout element
  const iconSpan = createElement("span", { class: "icon-wrapper" }) as HTMLElement;
  if (svgMarkup) {
    iconSpan.innerHTML = svgMarkup;
  }

  // Create text label node if label exists
  const textSpan = label
    ? (createElement("span", { class: "button-label" }, [label]) as HTMLElement)
    : null;

  // Prepare event listeners if callback provided
  let clickHandler: ((e: MouseEvent) => void) | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  const events: Record<string, EventListener> = {};

  if (typeof onClick === "function") {
    clickHandler = (e: MouseEvent) => {
      e.preventDefault();
      onClick(e);
    };

    keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e);
      }
    };

    events.click = clickHandler as EventListener;
    events.keydown = keyHandler as EventListener;
  }

  // Construct children array, filtering out null values
  const children = [iconSpan, textSpan].filter((child): child is HTMLElement => child !== null);

  // Construct button using createElement specification
  const button = createElement(
    "div",
    {
      class: `logoicon${suffix}`.trim(),
      id: id || undefined,
      role: "button",
      "aria-label": ariaLabel || label || "Icon Button",
      tabindex: "0",
      events,
    },
    children
  ) as CleanableButtonElement;

  // Attach cleanup function to dismantle event listeners if removed manually
  if (clickHandler && keyHandler) {
    const boundClickHandler = clickHandler;
    const boundKeyHandler = keyHandler;

    button.cleanup = () => {
      button.removeEventListener("click", boundClickHandler as EventListener);
      button.removeEventListener("keydown", boundKeyHandler as EventListener);
    };
  }

  return button;
}