import { createElement } from "../../../components/createElement.js";
import { createOption } from "../../../components/ui/createOption.mjs";

/**
 * Creates a lightweight debounced wrapper for input handlers.
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generates filter and sort control elements bound to a shared state object.
 *
 * @param {Object} state - Current filter and sort criteria.
 * @param {Function} onFilterChange - Callback executed when any filter setting mutates.
 * @returns {HTMLElement} Filter panel container.
 */
export function createFilterControls(state = {}, onFilterChange = () => {}) {
  const container = createElement("div", { class: "farm__filters" });

  const searchInput = createElement("input", {
    type: "text",
    placeholder: "🔍 Search farms…",
    class: "farm__search",
    value: state.searchKeyword || ""
  });

  const sortSelect = createElement("select", { class: "farm__sort" });
  const sortOptions = [
    ["", "Sort by…"],
    ["name-asc", "Name A→Z"],
    ["name-desc", "Name Z→A"],
    ["rating-desc", "Rating ↓"],
    ["rating-asc", "Rating ↑"]
  ];

  const currentSortVal = state.sortBy && state.sortDir ? `${state.sortBy}-${state.sortDir}` : "";
  sortOptions.forEach(([val, label]) => {
    const opt = createOption(val, label);
    if (val === currentSortVal) opt.selected = true;
    sortSelect.append(opt);
  });

  const locationInput = createElement("input", {
    type: "text",
    placeholder: "📍 Filter by location",
    class: "farm__location",
    value: state.locationFilter || ""
  });

  const availToggle = createElement("input", {
    type: "checkbox"
  });
  availToggle.checked = Boolean(state.onlyAvailable);

  const availLabel = createElement("label", { class: "farm__availability-label" }, [
    "🟢 Available Only ",
    availToggle
  ]);

  // Debounced input listeners
  const handleSearchInput = debounce((e) => {
    state.searchKeyword = e.target.value.toLowerCase().trim();
    onFilterChange();
  }, 250);

  const handleLocationInput = debounce((e) => {
    state.locationFilter = e.target.value.toLowerCase().trim();
    onFilterChange();
  }, 250);

  searchInput.addEventListener("input", handleSearchInput);
  locationInput.addEventListener("input", handleLocationInput);

  sortSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    if (!val) {
      state.sortBy = "";
      state.sortDir = "";
    } else {
      const [key, dir] = val.split("-");
      state.sortBy = key;
      state.sortDir = dir;
    }
    onFilterChange();
  });

  availToggle.addEventListener("change", (e) => {
    state.onlyAvailable = e.target.checked;
    onFilterChange();
  });

  container.append(
    searchInput,
    sortSelect,
    locationInput,
    availLabel
  );

  return container;
}

/**
 * Applies search, location, availability, and sorting constraints to a list of farms.
 *
 * @param {Array<Object>} farms - Collection of farm records.
 * @param {Object} state - Filter and sort state.
 * @returns {Array<Object>} Processed farm list.
 */
export function applyFiltersAndSort(farms = [], state = {}) {
  let result = Array.isArray(farms) ? farms.slice() : [];

  if (state.searchKeyword) {
    const kw = state.searchKeyword.toLowerCase();
    result = result.filter((f) => (f?.name || "").toLowerCase().includes(kw));
  }

  if (state.locationFilter) {
    const loc = state.locationFilter.toLowerCase();
    result = result.filter((f) => (f?.location || "").toLowerCase().includes(loc));
  }

  if (state.onlyAvailable) {
    result = result.filter((f) => Boolean(f?.available));
  }

  if (state.sortBy) {
    result.sort((a, b) => {
      let res = 0;

      if (state.sortBy === "name") {
        res = (a?.name || "").localeCompare(b?.name || "");
      } else if (state.sortBy === "rating") {
        res = (a?.rating ?? 0) - (b?.rating ?? 0);
      }

      return state.sortDir === "asc" ? res : -res;
    });
  }

  return result;
}