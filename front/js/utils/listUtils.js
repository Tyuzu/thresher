import { createElement } from "../components/createElement.js";

const sortOptionsByType = {
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
function debounce(fn, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Reusable filter controls factory
 */
export function createFilterControls({ type, items = [], onRender }) {
  const wrapper = createElement("div", { class: `filter-controls ${type}-controls` });

  const searchInput = createElement("input", {
    type: "search",
    placeholder: `Search ${type}...`,
    class: `${type}-search`,
    "aria-label": `Search elements inside ${type}`
  });

  const options = sortOptionsByType[type] || sortOptionsByType.default;
  const sortSelect = createElement("select", { 
    class: `${type}-sort`,
    "aria-label": "Select layout sorting type parameters"
  }, 
    options.map(opt => createElement("option", { value: opt.value }, [opt.label]))
  );

  const chipContainer = createElement("div", { 
    class: "category-chips",
    role: "group",
    "aria-label": "Filter items by category tag parameters"
  });
  
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const selectedCategory = { value: null };
  const chipButtonsMap = new Map();

  categories.forEach(cat => {
    const chip = createElement("button", {
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
    }, [cat]);

    chipButtonsMap.set(cat, chip);
    chipContainer.appendChild(chip);
  });

  // FIXED: Elements are correctly mounted into the control wrapper hierarchy tree
  if (categories.length > 0) {
    wrapper.appendChild(chipContainer);
  }
  wrapper.append(searchInput, sortSelect);

  function renderFilteredImmediate() {
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

  // Use debouncing for heavy keyup events, processing selection modifications instantly
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

/**
 * Core generic filter matching function logic
 */
export function filterItems(items, { keyword = "", category = null, extraFilters = [] }) {
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
export function sortItems(items, sortBy) {
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

/**
 * Domain-specific custom data pipelines
 */
function filterEvents(events, { keyword, category }) {
  const cleanKeyword = keyword.trim().toLowerCase();
  
  return filterItems(events, {
    category,
    extraFilters: [
      ev => {
        if (!cleanKeyword) return true;
        // FIXED: Shifted evaluation to use standard logical OR comparisons correctly
        const titleMatch = (ev.title || ev.name || "").toLowerCase().includes(cleanKeyword);
        const placeMatch = (ev.placename || "").toLowerCase().includes(cleanKeyword);
        return titleMatch || placeMatch;
      }
    ]
  });
}

function sortEvents(events, sortBy) {
  if (sortBy === "price") {
    return [...events].sort((a, b) => {
      const validPricesA = Array.isArray(a.prices) && a.prices.length ? a.prices : [0];
      const validPricesB = Array.isArray(b.prices) && b.prices.length ? b.prices : [0];
      return Math.min(...validPricesA) - Math.min(...validPricesB);
    });
  }
  return sortItems(events, sortBy);
}

function filterRecipes(recipes, { keyword, category }) {
  const cleanKeyword = keyword.trim().toLowerCase();

  return filterItems(recipes, {
    category,
    extraFilters: [
      r => {
        if (!cleanKeyword) return true;
        const baseMatch = (r.title || r.name || "").toLowerCase().includes(cleanKeyword);
        const ingredientMatch = Array.isArray(r.ingredients) && r.ingredients.some(i => 
          String(i && i.name ? i.name : i).toLowerCase().includes(cleanKeyword)
        );
        return baseMatch || ingredientMatch;
      }
    ]
  });
}

/**
 * Unified Filtering Engine Processor Route Handler
 */
export function applyFiltersAndSort(items, { keyword = "", category = null, sortBy = null, type = "generic" }) {
  if (!Array.isArray(items)) return [];
  
  let filtered;
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

export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function attachInfiniteScroll(target, callback, options = { threshold: 1.0 }) {
  if (!target) return null;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      callback();
    }
  }, options);
  observer.observe(target);
  return observer;
}