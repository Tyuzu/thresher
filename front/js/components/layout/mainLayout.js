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
 * Creates a standard two-column page structure with a main content area and an aside sidebar.
 *
 * @param {Object} [options={}] - Configuration options for the layout.
 * @param {HTMLElement|HTMLElement[]} [options.mainContent=[]] - Elements or single element for the main section.
 * @param {HTMLElement|HTMLElement[]} [options.asideContent=[]] - Elements or single element for the sidebar section.
 * @param {string} [options.pageClass="page-layout"] - Custom CSS class for the layout container.
 * @param {string} [options.page] - Page identifier for ad contexts.
 * @param {boolean} [options.showMainAd=false] - Whether to inject an ad slot at the bottom of main content.
 * @param {string} [options.mainAdPosition="main-bottom"] - Position descriptor for the main ad unit.
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
  mainAdOptions = {}
} = {}) {
  const mainElements = normalizeContent(mainContent);

  if (showMainAd) {
    const mainAd = adspace(mainAdPosition, page, mainAdOptions);
    if (mainAd) mainElements.push(mainAd);
  }

  const containerClass = ["two-column", pageClass].filter(Boolean).join(" ");

  const main = createElement("main", { class: "layout-main" }, mainElements);
  const aside = createElement("aside", { class: "layout-aside" }, normalizeContent(asideContent));

  return createElement("div", { class: containerClass }, [main, aside]);
}