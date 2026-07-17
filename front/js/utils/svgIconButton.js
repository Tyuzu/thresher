import { createElement } from "../components/createElement";

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
  
  const button = createElement("div", { 
    class: `logoicon${suffix}`.trim(), 
    id: id || undefined, // Drop attribute if value is blank
    role: "button",
    "aria-label": ariaLabel || label || "Icon Button",
    "tabindex": "0" // Kept lowercase for strict HTML parsing safety
  });

  // Render SVG safely wrapped in an isolated layout element
  const iconSpan = createElement("span", { class: "icon-wrapper" });
  if (svgMarkup) {
    iconSpan.innerHTML = svgMarkup;
  }
  button.appendChild(iconSpan);

  // Append text label if provided
  if (label) {
    const textSpan = createElement("span", { class: "button-label" }, [label]);
    button.appendChild(textSpan);
  }

  // Interactivity setup
  if (typeof onClick === "function") {
    const clickHandler = (e) => { 
      e.preventDefault(); 
      onClick(e); // Pass the event object upstream
    };

    const keyHandler = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e); // Pass the event object upstream
      }
    };

    button.addEventListener("click", clickHandler);
    button.addEventListener("keydown", keyHandler);

    // Clean reference layer to handle manual element dismounts
    button.cleanup = () => {
      button.removeEventListener("click", clickHandler);
      button.removeEventListener("keydown", keyHandler);
    };
  }

  return button;
}