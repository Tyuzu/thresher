import { createElement } from "../../../components/createElement.js";
import { createTabs } from "../../utils/persistTabs.js";
import { renderCategoryItems } from "./renderCategoryItems.js";
import { createFilterPanel } from "./createFilterPanel.js";
import { debounce } from "../../../utils/deutils.js";

/**
 * Renders the category browser tab layout with interactive filtering.
 *
 * @param {HTMLElement} container - DOM node where the category browser will mount.
 */
export function showCategoryBrowser(container) {
  if (!container) return;

  container.replaceChildren();

  const filters = {
    minPrice: "",
    maxPrice: "",
    inStock: false,
    region: "",
    lat: null,
    lng: null
  };

  /**
   * Refreshes the active tab content using the updated state of `filters`.
   */
  const refreshActiveTab = () => {
    const activeTab = container.querySelector(".tab-content.active, [role='tabpanel']:not([hidden])");
    if (activeTab) {
      const category = activeTab.dataset.category || activeTab.id.replace("-tab", "");
      renderCategoryItems(activeTab, category, filters);
    }
  };

  // Debounced wrapper to prevent rapid re-renders on filter changes
  const onFilterChange = debounce(refreshActiveTab, 300);

  const filterPanel = createFilterPanel(filters, onFilterChange);

  const categories = [
    { id: "fruits-tab", title: "🍎 Fruits", category: "Fruits" },
    { id: "vegetables-tab", title: "🥕 Vegetables", category: "Vegetables" },
    { id: "grains-tab", title: "🌾 Grains", category: "Grains" },
    { id: "dairy-tab", title: "🥛 Dairy", category: "Dairy" },
    { id: "fishery-tab", title: "🐟 Fishery", category: "Fishery" },
    { id: "poultry-tab", title: "🐔 Poultry", category: "Poultry" },
    { id: "flowers-tab", title: "🌸 Flowers", category: "Flowers" },
    { id: "others-tab", title: "🌱 Others", category: "Others" }
  ];

  const tabs = categories.map(({ id, title, category }) => ({
    id,
    title,
    render: (el) => {
      el.dataset.category = category;
      return renderCategoryItems(el, category, filters);
    }
  }));

  const tabComponent = createTabs(tabs);
  const browserWrapper = createElement("div", { class: "category-browser" }, [
    filterPanel,
    tabComponent
  ]);

  container.append(browserWrapper);
}