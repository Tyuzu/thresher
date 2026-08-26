import Notify from "../../components/ui/Notify.js";
import { createTabs } from "../../utils/persistTabs.js";
import { createElement } from "../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { searchSVG } from "../../components/svgs/featherSVGs.js";
import { debounce } from "../../utils/deutils.js";
import {
  fetchAutocompleteSuggestions,
  fetchSearchResults,
  type SearchItem,
  type SearchResult
} from "./api.js";

// --- Types & Interfaces ---

export interface TabData {
  id: string;
  title: string;
}

// --- State ---

let currentTab = "all";
let searchQuery = "";
let autocompleteController: AbortController | null = null;
const autocompleteCache = new Map<string, string[]>();

// --- Utilities ---


function formatDate(dateString?: string): string {
  if (!dateString) return "Unknown";
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderEmpty(container: HTMLElement): void {
  container.appendChild(createElement("p", { class: "empty-state" }, ["No results found."]));
}

async function fetchResults(tabId: string, query: string, container: HTMLElement): Promise<void> {
  container.textContent = "Loading...";

  try {
    const results = await fetchSearchResults(tabId, query);
    displaySearchResults(tabId, results, container);
  } catch (err) {
    Notify("Error fetching search results.", { type: "error", duration: 3000 });
    renderEmpty(container);
  }
}

// --- Main Entry ---

export async function displaySearchForm(container: HTMLElement): Promise<void> {
  container.textContent = "";

  const searchContainer = createElement("div", { class: "search-container vflex" });

  // --- SEARCH BAR UI ---
  const searchBarWrapper = createElement("div", { class: "search-bar-wrapper hflex", style: { position: "relative" } });
  
  const searchInput = createElement("input", {
    id: "search-query",
    type: "search",
    placeholder: "Search anything...",
    class: "search-field flex-grow"
  }) as HTMLInputElement;

  const searchButton = createIconButton({
    svgMarkup: searchSVG,
    classSuffix: "search-btn"
  });

  const autocompleteList = createElement("ul", {
    id: "autocomplete-list",
    class: "autocomplete-list"
  });

  searchBarWrapper.append(searchInput, searchButton, autocompleteList);

  // --- TABS UI ---
  const tabsData: TabData[] = [
    { id: "all", title: "All" },
    { id: "events", title: "Events" },
    { id: "places", title: "Places" },
    { id: "feedposts", title: "Social" },
    { id: "merch", title: "Merch" },
    { id: "blogposts", title: "Posts" },
    { id: "farms", title: "Farms" },
    { id: "songs", title: "Songs" },
    { id: "users", title: "Users" },
    { id: "recipes", title: "Recipes" },
    { id: "products", title: "Products" },
    { id: "menu", title: "Menu" },
    { id: "media", title: "Media" },
    { id: "crops", title: "Crops" },
    { id: "baitoworkers", title: "Workers" },
    { id: "baitos", title: "Baitos" },
    { id: "artists", title: "Artists" }
  ];

  const tabsUI = createTabs(
    tabsData.map(tab => ({
      ...tab,
      render: async (tabContainer: HTMLElement) => {
        if (!searchQuery) return;
        await fetchResults(tab.id, searchQuery, tabContainer);
      }
    })),
    "search-tabs",
    "all",
    (tabId: string) => {
      currentTab = tabId;
    }
  );

  searchContainer.append(searchBarWrapper, tabsUI);
  container.appendChild(searchContainer);

  // --- EVENTS ---

  const refreshCurrentTab = () => {
    const active = document.querySelector<HTMLElement>(".tab-content.active");
    if (active) {
      fetchResults(currentTab, searchQuery, active);
    }
  };

  const triggerSearch = () => {
    searchQuery = searchInput.value.trim();
    
    if (!searchQuery) {
      Notify("Please enter a search query.", { type: "info", duration: 3000 });
      return;
    }
    
    autocompleteList.textContent = ""; // Hide list on search
    refreshCurrentTab();
  };

  searchButton.addEventListener("click", triggerSearch);

  searchInput.addEventListener("input", debounce(handleAutocomplete, 250) as EventListener);

  searchInput.addEventListener("keydown", (e: Event) => {
    const keyboardEvent = e as KeyboardEvent;
    
    handleKeyboardNavigation(keyboardEvent);
    
    if (keyboardEvent.key === "Enter") {
      keyboardEvent.preventDefault(); // Prevent form submission if wrapped in a form
      triggerSearch();
    }
  });

  document.addEventListener("click", (e: Event) => {
    if (!searchBarWrapper.contains(e.target as Node)) {
      autocompleteList.textContent = "";
    }
  });
}

// --- Autocomplete ---

async function handleAutocomplete(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const query = target.value.trim();
  const list = document.getElementById("autocomplete-list");

  if (!list) return;
  list.textContent = "";

  if (!query) return;

  if (autocompleteCache.has(query)) {
    renderSuggestions(autocompleteCache.get(query)!, list);
    return;
  }

  try {
    autocompleteController?.abort();
    autocompleteController = new AbortController();

    const suggestions = await fetchAutocompleteSuggestions(query);
    autocompleteCache.set(query, suggestions);
    renderSuggestions(suggestions, list);
  } catch (error) {
    const err = error as Error;
    if (err.name !== "AbortError") {
      console.error("Autocomplete error:", err);
    }
  }
}

function renderSuggestions(suggestions: string[], list: HTMLElement): void {
  list.textContent = "";

  if (!suggestions.length) return;

  const fragment = document.createDocumentFragment();

  suggestions.forEach(s => {
    const li = createElement("li", { class: "autocomplete-item" }, [s]);

    li.addEventListener("click", () => {
      const searchInput = document.getElementById("search-query") as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = s;
      }
      
      list.textContent = "";
      searchQuery = s;
      
      const activeTab = document.querySelector<HTMLElement>(".tab-content.active");
      if (activeTab) {
        fetchResults(currentTab, searchQuery, activeTab);
      }
    });

    fragment.appendChild(li);
  });

  list.appendChild(fragment);
}

// --- Keyboard Navigation ---

function handleKeyboardNavigation(event: KeyboardEvent): void {
  const list = document.getElementById("autocomplete-list");
  if (!list) return;

  const items = list.querySelectorAll<HTMLElement>(".autocomplete-item");
  if (!items.length) return;

  let index = Array.from(items).findIndex(i => i.classList.contains("selected"));

  if (event.key === "ArrowDown") {
    index = (index + 1) % items.length;
    event.preventDefault();
  } else if (event.key === "ArrowUp") {
    index = (index - 1 + items.length) % items.length;
    event.preventDefault();
  } else if (event.key === "Enter") {
    if (index >= 0) {
      items[index].click();
      event.preventDefault();
    }
    return;
  } else {
    return;
  }

  items.forEach(i => i.classList.remove("selected"));
  if (index >= 0) {
    items[index].classList.add("selected");
    // Ensure the selected item stays in view
    items[index].scrollIntoView({ block: "nearest" });
  }
}

// --- Render Results ---

function displaySearchResults(entityType: string, data: SearchResult | null, container: HTMLElement): void {
  container.textContent = "";

  if (!data) {
    return renderEmpty(container);
  }

  const fragment = document.createDocumentFragment();

  if (entityType === "all" && typeof data === "object" && !Array.isArray(data)) {
    let hasResults = false;

    for (const [key, arr] of Object.entries(data)) {
      if (Array.isArray(arr) && arr.length > 0) {
        hasResults = true;
        fragment.appendChild(createElement("h2", { class: "result-group-title" }, [capitalize(key)]));
        
        const grid = createElement("div", { class: "results-grid" });
        arr.forEach(item => grid.appendChild(createCard(key, item)));
        fragment.appendChild(grid);
      }
    }

    if (!hasResults) {
      renderEmpty(container);
    } else {
      container.appendChild(fragment);
    }
    return;
  }

  if (Array.isArray(data)) {
    if (!data.length) {
      return renderEmpty(container);
    }

    const grid = createElement("div", { class: "results-grid" });
    data.forEach(item => grid.appendChild(createCard(entityType, item)));
    container.appendChild(grid);
    return;
  }

  renderEmpty(container);
}

function createCard(entityType: string, item: SearchItem): HTMLElement {
  const card = createElement("div", { class: `result-card type-${entityType}` });
  const header = createElement("div", { class: "result-header hflex" });

  if (item.image) {
    const entityEnumVal = EntityType[entityType.toUpperCase() as keyof typeof EntityType] || EntityType.BLOGPOST;
    
    header.appendChild(
      createElement("img", {
        src: resolveImagePath(entityEnumVal, PictureType.THUMB, item.image),
        alt: item.title || entityType,
        loading: "lazy",
        class: "result-image"
      })
    );
  }

  header.appendChild(
    createElement("div", { class: "result-info" }, [
      createElement("h3", { class: "result-title" }, [item.title || "No Title"])
    ])
  );

  const details = createElement("div", { class: "result-details" }, [
    createElement("p", { class: "result-description" }, [item.description || "No description available."]),
    createElement("small", { class: "result-date" }, [`Created: ${formatDate(item.createdAt)}`])
  ]);

  const footer = createElement("div", { class: "result-footer" });
  const id = item.id || item.entityid;

  if (id) {
    footer.appendChild(
      createElement("a", {
        href: `/${entityType}/${id}`,
        class: "button button-secondary result-link",
        target: "_blank"
      }, ["View Details"])
    );
  }

  card.append(header, details);
  if (footer.children.length) card.appendChild(footer);

  return card;
}

export { displaySearchForm as displaySearch };