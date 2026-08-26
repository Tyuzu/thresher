import "../../../css/ui/LoadingSpinner.css";
import { createElement } from "../../components/createElement.js";

export type HideSpinnerFn = () => void;

interface LoadingSpinnerFunction {
  (): HideSpinnerFn;
  createElement: () => HTMLDivElement;
}

/**
 * Creates and mounts a loading spinner overlay to the DOM.
 * @returns A cleanup function to remove the spinner.
 */
const LoadingSpinner: LoadingSpinnerFunction = Object.assign(
  function (): HideSpinnerFn {
    const spinnerElement = LoadingSpinner.createElement();
    const container = document.body || document.documentElement;

    if (container) {
      container.appendChild(spinnerElement);
    }

    // Return hide/cleanup function
    return () => {
      if (spinnerElement.parentNode) {
        spinnerElement.parentNode.removeChild(spinnerElement);
      }
    };
  },
  {
    /**
     * Pure Element Generator
     * Use when appending directly to custom target elements.
     */
    createElement: (): HTMLDivElement => {
      const orbit = createElement("span", { class: "loading-spinner__orbit" }, [
        createElement("span", { class: "loading-spinner__dot" }),
        createElement("span", { class: "loading-spinner__dot" }),
        createElement("span", { class: "loading-spinner__dot" })
      ]);

      const core = createElement("span", { class: "loading-spinner__core" });

      const spinner = createElement(
        "div",
        {
          class: "loading-spinner",
          role: "status",
          "aria-label": "Loading"
        },
        [orbit, core]
      ) as HTMLDivElement;

      return spinner;
    }
  }
);

export default LoadingSpinner;
export { LoadingSpinner as LoadingSpinnerComponent };