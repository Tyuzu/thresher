import { createElement } from "../../../components/createElement.js";
import { createOption } from "../../../components/ui/createOption.js";

export interface FilterState {
  searchKeyword?: string;
  sortBy?: "name" | "rating" | string;
  sortDir?: "asc" | "desc" | string;
  locationFilter?: string;
  onlyAvailable?: boolean;
}

export interface FarmRecord {
  name?: string;
  location?: string;
  available?: boolean;
  rating?: number;
  [key: string]: any;
}

type EventCallback<T extends Event = Event> = (event: T) => void;

/**
 * Creates a lightweight debounced wrapper for input handlers.
 */
function debounce<T extends any[]>(fn: (...args: T) => void, delay = 300): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generates filter and sort control elements bound to a shared state object.
 *
 * @param state - Current filter and sort criteria.
 * @param onFilterChange - Callback executed when any filter setting mutates.
 * @returns Filter panel container.
 */
export function createFilterControls(
  state: FilterState = {},
  onFilterChange: () => void = () => {}
): HTMLElement {
  const container = createElement("div", { class: "farm__filters" }) as HTMLElement;

  const searchInput = createElement("input", {
    type: "text",
    placeholder: "🔍 Search farms…",
    class: "farm__search",
    value: state.searchKeyword || ""
  }) as HTMLInputElement;

  const sortSelect = createElement("select", { class: "farm__sort" }) as HTMLSelectElement;
  const sortOptions: [string, string][] = [
    ["", "Sort by…"],
    ["name-asc", "Name A→Z"],
    ["name-desc", "Name Z→A"],
    ["rating-desc", "Rating ↓"],
    ["rating-asc", "Rating ↑"]
  ];

  const currentSortVal = state.sortBy && state.sortDir ? `${state.sortBy}-${state.sortDir}` : "";
  sortOptions.forEach(([val, label]) => {
    const opt = createOption(val, label) as HTMLOptionElement;
    if (val === currentSortVal) opt.selected = true;
    sortSelect.append(opt);
  });

  const locationInput = createElement("input", {
    type: "text",
    placeholder: "📍 Filter by location",
    class: "farm__location",
    value: state.locationFilter || ""
  }) as HTMLInputElement;

  const availToggle = createElement("input", {
    type: "checkbox"
  }) as HTMLInputElement;
  availToggle.checked = Boolean(state.onlyAvailable);

  const availLabel = createElement("label", { class: "farm__availability-label" }, [
    "🟢 Available Only ",
    availToggle
  ]) as HTMLLabelElement;

  // Debounced input listeners
  const handleSearchInput: EventCallback<InputEvent> = debounce((e) => {
    const target = e.target as HTMLInputElement;
    state.searchKeyword = target.value.toLowerCase().trim();
    onFilterChange();
  }, 250);

  const handleLocationInput: EventCallback<InputEvent> = debounce((e) => {
    const target = e.target as HTMLInputElement;
    state.locationFilter = target.value.toLowerCase().trim();
    onFilterChange();
  }, 250);

  searchInput.addEventListener("input", handleSearchInput as EventListener);
  locationInput.addEventListener("input", handleLocationInput as EventListener);

  sortSelect.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const val = target.value;
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

  availToggle.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLInputElement;
    state.onlyAvailable = target.checked;
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
 * @param farms - Collection of farm records.
 * @param state - Filter and sort state.
 * @returns Processed farm list.
 */
export function applyFiltersAndSort<T extends FarmRecord>(
  farms: T[] = [],
  state: FilterState = {}
): T[] {
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