import { createElement } from "../../../components/createElement.js";
import { createTabs } from "../../../utils/persistTabs.js";
import { renderCategoryItems } from "./renderCategoryItems.js";
import { createFilterPanel } from "./createFilterPanel.js";
import { debounce } from "../../../utils/deutils.js";

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  region: string;
  lat: number | null;
  lng: number | null;
}

export interface CategoryDef {
  id: string;
  title: string;
  category: string;
}

export interface TabDef {
  id: string;
  title: string;
  render: (el: HTMLElement) => void | Promise<void>;
}

/**
 * Renders the category browser tab layout with interactive filtering.
 *
 * @param container - DOM node where the category browser will mount.
 */
export function showCategoryBrowser(container: HTMLElement | null): void {
  if (!container) return;

  container.replaceChildren();

  const filters: FilterState = {
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
  const refreshActiveTab = (): void => {
    const activeTab = container.querySelector<HTMLElement>(
      ".tab-content.active, [role='tabpanel']:not([hidden])"
    );
    if (!activeTab) return;

    const category = activeTab.dataset.category || activeTab.id.replace("-tab", "");
    // Map local FilterState to the CategoryFilters shape expected by renderCategoryItems
    renderCategoryItems(activeTab, category, {
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStock: filters.inStock,
      region: filters.region,
      lat: filters.lat ?? undefined,
      lng: filters.lng ?? undefined
    });
  };

  // Debounced wrapper to prevent rapid re-renders on filter changes
  const onFilterChange = debounce(refreshActiveTab, 300);

  const filterPanel = createFilterPanel(filters, onFilterChange);

  const categories: CategoryDef[] = [
    { id: "fruits-tab", title: "🍎 Fruits", category: "Fruits" },
    { id: "vegetables-tab", title: "🥕 Vegetables", category: "Vegetables" },
    { id: "grains-tab", title: "🌾 Grains", category: "Grains" },
    { id: "dairy-tab", title: "🥛 Dairy", category: "Dairy" },
    { id: "fishery-tab", title: "🐟 Fishery", category: "Fishery" },
    { id: "poultry-tab", title: "🐔 Poultry", category: "Poultry" },
    { id: "flowers-tab", title: "🌸 Flowers", category: "Flowers" },
    { id: "others-tab", title: "🌱 Others", category: "Others" }
  ];

  const tabs: TabDef[] = categories.map(({ id, title, category }) => ({
    id,
    title,
    render: (el: HTMLElement) => {
      el.dataset.category = category;
      return renderCategoryItems(el, category, {
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        inStock: filters.inStock,
        region: filters.region,
        lat: filters.lat ?? undefined,
        lng: filters.lng ?? undefined
      });
    }
  }));

  const tabComponent = createTabs(tabs);
  const browserWrapper = createElement("div", { class: "category-browser" }, [
    filterPanel,
    tabComponent
  ]);

  container.append(browserWrapper);
}