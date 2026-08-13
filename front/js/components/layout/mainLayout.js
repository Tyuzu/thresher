import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

/**
 * Normalizes mixed inputs (single nodes, strings, arrays) into a flat array of valid DOM Nodes.
 * Automatically wraps primitive strings/numbers in Text nodes and drops falsy values.
 *
 * @param {HTMLElement|Text|Array|string|number|null|undefined} content
 * @returns {Node[]}
 */
const normalizeContent = (content) => {
  if (content == null || content === false) return [];

  return [content]
    .flat(Infinity)
    .filter(Boolean)
    .map((item) => (item instanceof Node ? item : document.createTextNode(String(item))));
};

/**
 * Creates a standard two-column page structure with a main content area and an aside sidebar.
 *
 * @param {Object} [options={}] - Configuration options for the layout.
 * @param {HTMLElement|HTMLElement[]} [options.mainContent=[]] - Elements for the main section.
 * @param {HTMLElement|HTMLElement[]} [options.asideContent=[]] - Elements for the sidebar section.
 * @param {string} [options.pageClass="page-layout"] - Custom CSS class for the layout container.
 * @param {string} [options.page] - Page identifier for ad contexts.
 * @param {boolean} [options.showMainAd=false] - Whether to inject an ad slot in the main content area.
 * @param {string} [options.mainAdPosition="main-bottom"] - Position descriptor for the main ad unit.
 * @param {"top"|"bottom"} [options.mainAdPlacement="bottom"] - Placement of the main ad relative to content.
 * @param {Object} [options.mainAdOptions={}] - Settings for the main ad unit.
 * @returns {HTMLElement} The complete layout container element.
 */
export function createMainLayout({
  mainContent = [],
  asideContent = [],
  pageClass = "page-layout",
  page,
  showMainAd = false,
  mainAdPosition = "main-bottom",
  mainAdPlacement = "bottom",
  mainAdOptions = {}
} = {}) {
  // 1. Resolve optional main ad node
  const mainAdNode = showMainAd ? adspace(mainAdPosition, page, mainAdOptions) : null;

  // 2. Normalize and order main section children
  const normalizedMain = normalizeContent(mainContent);
  const finalMainContent = [
    mainAdPlacement === "top" && mainAdNode,
    ...normalizedMain,
    mainAdPlacement === "bottom" && mainAdNode
  ].filter(Boolean);

  // 3. Construct layout containers
  const containerClass = ["two-column", pageClass].filter(Boolean).join(" ");

  const main = createElement("main", { class: "layout-main" }, finalMainContent);
  const aside = createElement("aside", { class: "layout-aside" }, normalizeContent(asideContent));

  return createElement("div", { class: containerClass }, [main, aside]);
}