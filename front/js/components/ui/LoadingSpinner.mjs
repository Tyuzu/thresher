import "../../../css/ui/LoadingSpinner.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed

const LoadingSpinner = () => {
  const orbit = createElement("span", { class: "loading-spinner__orbit" }, [
    createElement("span", { class: "loading-spinner__dot" }),
    createElement("span", { class: "loading-spinner__dot" }),
    createElement("span", { class: "loading-spinner__dot" })
  ]);

  const core = createElement("span", { class: "loading-spinner__core" });

  const spinner = createElement("div", {
    class: "loading-spinner",
    role: "status",
    "aria-label": "Loading"
  }, [orbit, core]);

  return spinner;
};

export default LoadingSpinner;
export { LoadingSpinner };