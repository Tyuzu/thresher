import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

/**
 * Creates a standard two-column page structure with Main content and Aside sidebar.
 * @param {Object} options
 * @param {HTMLElement|HTMLElement[]} [options.mainContent=[]] - Elements or single element for the main section.
 * @param {HTMLElement|HTMLElement[]} [options.asideContent=[]] - Elements or single element for the sidebar section.
 * @param {string} [options.pageClass="page-layout"] - Optional custom CSS class for the layout container.
 * @param {string} [options.page] - Page identifier for ad contexts. Defaults to auto-resolving route path if omitted.
 * @param {boolean} [options.showMainAd=false] - Optional boolean to inject an ad slot at the bottom of main content.
 * @param {string} [options.mainAdPosition="main-bottom"] - Position descriptor for the main content ad unit.
 * @param {Object} [options.mainAdOptions={}] - Ad settings for the main content ad unit.
 * @returns {HTMLElement} The complete layout container.
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
  const layout = createElement("div", { class: `two-column ${pageClass}`.trim() });

  const mainElements = Array.isArray(mainContent) ? [...mainContent] : [mainContent];

  // Optional: Add a main-content stream ad slot
  if (showMainAd) {
    mainElements.push(adspace(mainAdPosition, page, mainAdOptions));
  }

  const main = createElement("main", { class: "layout-main" }, mainElements);

  const asideElements = Array.isArray(asideContent) ? asideContent : [asideContent];
  const aside = createElement("aside", { class: "layout-aside" }, asideElements);

  layout.append(main, aside);
  return layout;
}