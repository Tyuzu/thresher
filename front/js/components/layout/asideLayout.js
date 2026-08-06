import "../../../css/layout/aside.css";
import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

/**
 * Reusable sidebar element builder with title, actions, custom content, and optional ad slot.
 * @param {Object} options
 * @param {string} [options.title="Actions"] - Optional section title for the sidebar. Pass null/empty to omit.
 * @param {HTMLElement[]} [options.actions=[]] - Action buttons or interactive controls.
 * @param {HTMLElement[]} [options.children=[]] - Additional custom elements/widgets.
 * @param {boolean} [options.showAd=true] - Whether to render an adspace block at the bottom.
 * @param {string} [options.page] - Page context override for ads. If omitted, newads.js automatically resolves from URL path.
 * @param {string} [options.adPosition="aside"] - Position descriptor for the ad unit.
 * @param {Object} [options.adOptions={}] - Configuration options for advertEmbed (e.g., refreshInterval, width, height).
 * @returns {HTMLElement[]} Aside content elements array.
 */
export function createAsideContent({
  title = "Actions",
  actions = [],
  children = [],
  showAd = true,
  page,
  adPosition = "aside",
  adOptions = {}
} = {}) {
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
    // Rely on newads.js automatic page detection if 'page' is not explicitly specified
    content.push(adspace(adPosition, page, adOptions));
  }

  return content;
}