import "../../../css/layout/aside.css";
import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/home/homeHelpers.js";

/**
 * Reusable sidebar element builder with title, actions, custom content, and optional ad slot.
 * @param {Object} options
 * @param {string} [options.title] - Optional section title for the sidebar.
 * @param {HTMLElement[]} [options.actions=[]] - Action buttons or interactive controls.
 * @param {HTMLElement[]} [options.children=[]] - Additional custom elements/widgets.
 * @param {boolean} [options.showAd=true] - Whether to render an adspace block at the bottom.
 * @returns {HTMLElement} Aside content structure.
 */
export function createAsideContent({ title = "Actions", actions = [], children = [], showAd = true }) {
  const content = [];

  if (title) {
    content.push(createElement("h2", {}, [title]));
  }

  if (actions.length > 0) {
    const actionGroup = createElement("div", { class: "aside-actions" }, actions);
    content.push(actionGroup);
  }

  if (children.length > 0) {
    content.push(...children);
  }

  if (showAd) {
    content.push(adspace("aside"));
  }

  return content;
}