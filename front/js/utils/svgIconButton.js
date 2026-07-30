import { createElement } from "../components/createElement.js";

/**
 * Creates an accessible custom icon button.
 * 
 * @param {Object} props
 * @param {string} props.classSuffix - CSS subclass appended to the button container.
 * @param {string} props.svgMarkup - Raw inline SVG content string.
 * @param {Function} props.onClick - Execution callback when the button is triggered.
 * @param {string} [props.label=""] - Optional text displayed inside the button next to the icon.
 * @param {string} [props.id=""] - DOM ID identification.
 * @param {string} [props.ariaLabel=""] - Direct screen-reader identifier.
 * @returns {HTMLElement} The initialized interactive button node.
 */
export function createIconButton({ classSuffix, svgMarkup, onClick, label = "", id = "", ariaLabel = "" }) {
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
  let clickHandler = null;
  let keyHandler = null;
  const events = {};

  if (typeof onClick === "function") {
    clickHandler = (e) => { 
      e.preventDefault(); 
      onClick(e); // Pass the event object upstream
    };

    keyHandler = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e); // Pass the event object upstream
      }
    };

    events.click = clickHandler;
    events.keydown = keyHandler;
  }

  // Construct button using createElement specification
  const button = createElement("div", { 
    class: `logoicon${suffix}`.trim(), 
    id: id || undefined, // Dropped attribute if blank
    role: "button",
    "aria-label": ariaLabel || label || "Icon Button",
    tabindex: "0",
    events
  }, [iconSpan, textSpan]);

  // Attach clean reference layer to handle manual element dismounts
  if (clickHandler && keyHandler) {
    button.cleanup = () => {
      button.removeEventListener("click", clickHandler);
      button.removeEventListener("keydown", keyHandler);
    };
  }

  return button;
}