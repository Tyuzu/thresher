import "../../../css/ui/Tooltip.css";
import { createElement } from "../../../utils/createElement.js"; // Adjust path as needed

const Tooltip = (text, { trigger = "?", position = "top" } = {}) => {
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
  );

  return wrapper;
};

export default Tooltip;