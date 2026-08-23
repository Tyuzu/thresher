import { createElement, ElementAttributes } from "../components/createElement.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export interface FilterableItem {
  id?: string | number;
  name?: string;
  title?: string;
  category?: string;
  createdAt?: string | number | Date;
  views?: number;
  capacity?: number;
  popular?: number;
  placename?: string;
  prices?: number[];
  ingredients?: Array<string | { name?: string }>;
  [key: string]: unknown;
}

export type ControlType = "events" | "places" | "recipes" | "default" | string;

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterControlsOptions<T extends FilterableItem> {
  type: ControlType;
  items?: T[];
  onRender?: (filteredItems: T[]) => void;
}

export interface FilterCriteria<T extends FilterableItem> {
  keyword?: string;
  category?: string | null;
  extraFilters?: Array<(item: T) => boolean>;
}

export interface ApplyFilterAndSortOptions {
  keyword?: string;
  category?: string | null;
  sortBy?: string | null;
  type?: ControlType;
}

export interface FilterControlsResult<T extends FilterableItem> {
  controls: HTMLDivElement;
  renderFiltered: () => void;
  chipContainer: HTMLDivElement;
}

/* =========================================================
   CONSTANTS & UTILITIES
========================================================= */

const sortOptionsByType: Record<string, SortOption[]> = {
  events: [
    { value: "date", label: "Sort by Date" },
    { value: "price", label: "Sort by Price" },
    { value: "title", label: "Sort by Title" }
  ],
  places: [
    { value: "name", label: "Sort by Name" },
    { value: "capacity", label: "Sort by Capacity" },
    { value: "recent", label: "Sort by Recent" },
    { value: "popular", label: "Sort by Popularity" }
  ],
  default: [
    { value: "date", label: "Sort by Date" },
    { value: "title", label: "Sort by Title" },
    { value: "views", label: "Sort by Views" }
  ]
};

/**
 * Creates a debounced utility function wrapper
 */
function debounce<T extends (...args: any[]) => void>(fn: T, delay = 250): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/* =========================================================
   COMPONENT & FILTER CONTROLS
========================================================= */

/**
 * Reusable filter controls factory
 */
export function createFilterControls<T extends FilterableItem>({
  type,
  items = [],
  onRender
}: FilterControlsOptions<T>): FilterControlsResult<T> {
  const wrapper = createElement("div", { class: `filter-controls ${type}-controls` });

  const searchInput = createElement("input", {
    type: "search",
    placeholder: `Search ${type}...`,
    class: `${type}-search`,
    "aria-label": `Search elements inside ${type}`
  });

  const options = sortOptionsByType[type] || sortOptionsByType.default;
  const sortSelect = createElement(
    "select",
    {
      class: `${type}-sort`,
      "aria-label": "Select layout sorting type parameters"
    },
    options.map(opt => createElement("option", { value: opt.value }, opt.label))
  );

  const chipContainer = createElement("div", {
    class: "category-chips",
    role: "group",
    "aria-label": "Filter items by category tag parameters"
  });

  const categories = [...new Set(items.map(i => i.category).filter((cat): cat is string => Boolean(cat)))];
  const selectedCategory: { value: string | null } = { value: null };
  const chipButtonsMap = new Map<string, HTMLButtonElement>();

  categories.forEach(cat => {
    const chipAttributes: ElementAttributes = {
      type: "button",
      class: "category-chip buttonx secondary",
      "aria-pressed": "false",
      events: {
        click: () => {
          const isSelected = selectedCategory.value === cat;
          selectedCategory.value = isSelected ? null : cat;

          // Sync visual ARIA pressed states perfectly across chips
          chipButtonsMap.forEach((btn, id) => {
            const state = id === selectedCategory.value;
            btn.classList.toggle("active", state);
            btn.setAttribute("aria-pressed", state ? "true" : "false");
          });

          renderFilteredImmediate();
        }
      }
    };

    const chip = createElement("button", chipAttributes, cat);

    chipButtonsMap.set(cat, chip);
    chipContainer.appendChild(chip);
  });

  if (categories.length > 0) {
    wrapper.appendChild(chipContainer);
  }
  wrapper.append(searchInput, sortSelect);

  function renderFilteredImmediate(): void {
    const filtered = applyFiltersAndSort(items, {
      keyword: searchInput.value,
      category: selectedCategory.value,
      sortBy: sortSelect.value,
      type
    });
    if (typeof onRender === "function") {
      onRender(filtered);
    }
  }

  // Use debouncing for heavy input events
  const renderFilteredDebounced = debounce(renderFilteredImmediate, 200);

  searchInput.addEventListener("input", renderFilteredDebounced);
  sortSelect.addEventListener("change", renderFilteredImmediate);

  // Initial data injection execute pass
  renderFilteredImmediate();

  return {
    controls: wrapper,
    renderFiltered: renderFilteredImmediate,
    chipContainer
  };
}

/* =========================================================
   CORE FILTERING & SORTING LOGIC
========================================================= */

/**
 * Core generic filter matching function logic
 */
export function filterItems<T extends FilterableItem>(
  items: T[],
  { keyword = "", category = null, extraFilters = [] }: FilterCriteria<T>
): T[] {
  const cleanKeyword = keyword.trim().toLowerCase();

  return items.filter(item => {
    if (category && item.category !== category) return false;

    if (cleanKeyword) {
      const matchText = (item.name || item.title || "").toLowerCase();
      if (!matchText.includes(cleanKeyword)) return false;
    }

    return extraFilters.every(f => f(item));
  });
}

/**
 * Standard Array Sorting Strategy Mapping Context
 */
export function sortItems<T extends FilterableItem>(items: T[], sortBy?: string | null): T[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case "date":
      case "createdAt": {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      case "title":
      case "name": {
        const strA = String(a.title || a.name || "");
        const strB = String(b.title || b.name || "");
        return strA.localeCompare(strB);
      }
      case "views":
        return (b.views || 0) - (a.views || 0);
      case "capacity":
        return (a.capacity || 0) - (b.capacity || 0);
      case "popular":
        return (b.popular || 0) - (a.popular || 0);
      default:
        return 0;
    }
  });
}

/* =========================================================
   DOMAIN SPECIFIC PIPELINES
========================================================= */

function filterEvents<T extends FilterableItem>(
  events: T[],
  { keyword = "", category = null }: { keyword: string; category: string | null }
): T[] {
  const cleanKeyword = keyword.trim().toLowerCase();

  return filterItems(events, {
    category,
    extraFilters: [
      (ev: T) => {
        if (!cleanKeyword) return true;
        const titleMatch = (ev.title || ev.name || "").toLowerCase().includes(cleanKeyword);
        const placeMatch = (ev.placename || "").toLowerCase().includes(cleanKeyword);
        return titleMatch || placeMatch;
      }
    ]
  });
}

function sortEvents<T extends FilterableItem>(events: T[], sortBy?: string | null): T[] {
  if (sortBy === "price") {
    return [...events].sort((a, b) => {
      const validPricesA = Array.isArray(a.prices) && a.prices.length ? a.prices : [0];
      const validPricesB = Array.isArray(b.prices) && b.prices.length ? b.prices : [0];
      return Math.min(...validPricesA) - Math.min(...validPricesB);
    });
  }
  return sortItems(events, sortBy);
}

function filterRecipes<T extends FilterableItem>(
  recipes: T[],
  { keyword = "", category = null }: { keyword: string; category: string | null }
): T[] {
  const cleanKeyword = keyword.trim().toLowerCase();

  return filterItems(recipes, {
    category,
    extraFilters: [
      (r: T) => {
        if (!cleanKeyword) return true;
        const baseMatch = (r.title || r.name || "").toLowerCase().includes(cleanKeyword);
        const ingredientMatch = Array.isArray(r.ingredients) && r.ingredients.some(i => {
          const ingName = typeof i === "object" && i !== null && "name" in i ? i.name : i;
          return String(ingName || "").toLowerCase().includes(cleanKeyword);
        });
        return baseMatch || ingredientMatch;
      }
    ]
  });
}

/**
 * Unified Filtering Engine Processor Route Handler
 */
export function applyFiltersAndSort<T extends FilterableItem>(
  items: T[],
  { keyword = "", category = null, sortBy = null, type = "generic" }: ApplyFilterAndSortOptions = {}
): T[] {
  if (!Array.isArray(items)) return [];

  let filtered: T[];
  switch (type) {
    case "events":
      filtered = filterEvents(items, { keyword, category });
      break;
    case "recipes":
      filtered = filterRecipes(items, { keyword, category });
      break;
    default:
      filtered = filterItems(items, { keyword, category });
  }

  return type === "events" ? sortEvents(filtered, sortBy) : sortItems(filtered, sortBy);
}

/* =========================================================
   PAGINATION & SCROLL OBSERVERS
========================================================= */

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function attachInfiniteScroll(
  target: Element | null,
  callback: () => void,
  options: IntersectionObserverInit = { threshold: 1.0 }
): IntersectionObserver | null {
  if (!target) return null;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      callback();
    }
  }, options);
  observer.observe(target);
  return observer;
}