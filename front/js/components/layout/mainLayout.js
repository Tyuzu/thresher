import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/home/homeHelpers.js";

/**
 * Creates a standard two-column page structure with Main content and Aside sidebar.
 * @param {Object} options
 * @param {HTMLElement|HTMLElement[]} options.mainContent - Elements or single element for the main section.
 * @param {HTMLElement|HTMLElement[]} options.asideContent - Elements or single element for the sidebar section.
 * @param {string} [options.pageClass] - Optional custom CSS class for the layout container.
 * @returns {HTMLElement} The complete layout element.
 */
export function createMainLayout({ mainContent = [], asideContent = [], pageClass = "page-layout" }) {
  const layout = createElement("div", { class: `two-column ${pageClass}` });

  const main = createElement("main", { class: "layout-main" }, 
    Array.isArray(mainContent) ? mainContent : [mainContent]
  );

  const aside = createElement("aside", { class: "layout-aside" }, 
    Array.isArray(asideContent) ? asideContent : [asideContent]
  );

  layout.append(main, aside);
  return layout;
}