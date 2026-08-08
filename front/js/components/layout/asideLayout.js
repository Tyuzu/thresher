import "../../../css/layout/aside.css";
import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

/**
 * Helper to normalize single nodes, arrays, or nested arrays into a clean array of valid Nodes.
 * Removes falsy values (null, undefined, false) to prevent rendering invalid DOM children.
 *
 * @param {HTMLElement|HTMLElement[]|null|undefined} content
 * @returns {HTMLElement[]}
 */
const normalizeContent = (content) => {
  if (!content) return [];
  return (Array.isArray(content) ? content : [content]).flat().filter(Boolean);
};

/**
 * Reusable sidebar element builder with title, actions, custom content, and optional ad slot.
 *
 * @param {Object} [options={}] - Configuration options for sidebar content.
 * @param {string|null} [options.title="Actions"] - Optional section title for the sidebar. Pass null or empty string to omit.
 * @param {HTMLElement|HTMLElement[]} [options.actions=[]] - Action buttons or interactive controls.
 * @param {HTMLElement|HTMLElement[]} [options.children=[]] - Additional custom elements or widgets.
 * @param {boolean} [options.showAd=true] - Whether to render an adspace block.
 * @param {string} [options.page] - Page context override for ads. If omitted, auto-resolves from route path.
 * @param {string} [options.adPosition="aside"] - Position descriptor for the ad unit.
 * @param {Object} [options.adOptions={}] - Configuration options for the ad unit.
 * @returns {HTMLElement[]} Array of elements ready to be inserted into an <aside> container.
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

  if (showAd) {
    const adNode = adspace(adPosition, page, adOptions);
    if (adNode) content.push(adNode);
  }

  if (title) {
    content.push(createElement("h2", { class: "aside-title" }, [title]));
  }

  const normalizedActions = normalizeContent(actions);
  if (normalizedActions.length > 0) {
    content.push(createElement("div", { class: "aside-actions" }, normalizedActions));
  }

  const normalizedChildren = normalizeContent(children);
  if (normalizedChildren.length > 0) {
    content.push(...normalizedChildren);
  }

  return content;
}