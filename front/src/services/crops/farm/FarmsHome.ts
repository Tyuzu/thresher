import { createElement } from "../../../components/createElement.js";
import { fetchFarms as fetchFarmList } from "../api.js";
import {
  renderFarmCards,
  renderFeaturedFarm,
  renderCTAFarm,
  renderWeatherWidget,
  renderFarmStats,
  Farm,
  ToggleFavoriteCallback
} from "./farmListHelpers.js";
import {
  createFilterControls,
  applyFiltersAndSort,
  FilterState
} from "./farmFilters.js";
import { createMainLayout } from "../../../components/layout/mainLayout.js";
import { createAsideContent } from "../../../components/layout/asideLayout.js";

// Config
const PAGE_SIZE = 10;

export interface AppState extends FilterState {
  farms: Farm[];
  page: number;
  isLoading: boolean;
  hasMore: boolean;
  favorites: Set<string>;
  minRating: number;
  maxRating: number;
}

interface FetchFarmsResponse {
  farms?: Farm[];
  [key: string]: any;
}

/**
 * Creates a fresh state instance to prevent cross-request state pollution.
 */
function createInitialState(): AppState {
  let favorites = new Set<string>();
  try {
    favorites = new Set(JSON.parse(localStorage.getItem("favFarms") || "[]"));
  } catch {
    favorites = new Set<string>();
  }

  return {
    farms: [],
    page: 1,
    isLoading: false,
    hasMore: true,
    favorites,
    searchKeyword: "",
    locationFilter: "",
    onlyAvailable: false,
    minRating: 0,
    maxRating: 5,
    sortBy: "",
    sortDir: ""
  };
}

// ---------- Data helpers ----------

function indexFarmsById(farms: Farm[]): Map<string, Farm> {
  const map = new Map<string, Farm>();
  farms.forEach((f) => {
    const farmId = f?.id ?? f?.farmid;
    if (f && farmId !== undefined) {
      map.set(String(farmId), f);
    }
  });
  return map;
}

function getTopRated(farms: Farm[], limit = 3): Farm[] {
  return [...farms]
    .filter((f): f is Farm & { rating: number } => typeof f?.rating === "number")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

// ---------- API ----------

async function fetchFarms(page: number): Promise<Farm[]> {
  try {
    const res = await fetchFarmList(page, PAGE_SIZE) as FetchFarmsResponse;
    return Array.isArray(res?.farms) ? res.farms : [];
  } catch (error) {
    console.error("Failed to fetch farms:", error);
    return [];
  }
}

// ---------- Grid ----------

interface GridController {
  container: HTMLElement;
  render: (farms: Farm[]) => void;
}

function Grid(isLoggedIn: boolean, toggleFavorite: ToggleFavoriteCallback): GridController {
  const container = createElement("div", { class: "farm__grid" }) as HTMLElement;

  return {
    container,
    render(farms: Farm[]) {
      container.replaceChildren();

      if (!farms.length) {
        container.append(
          createElement("p", { class: "farm__empty-message" }, ["No farms found."])
        );
        return;
      }

      renderFarmCards(farms, container, isLoggedIn, toggleFavorite);
    }
  };
}

// ---------- Sidebar Helper Builders ----------

function buildFavoritesContent(isLoggedIn: boolean, stateRef: AppState): HTMLElement | null {
  if (!isLoggedIn) return null;

  const farmIndex = indexFarmsById(stateRef.farms);

  if (stateRef.favorites.size === 0) {
    return createElement("p", {}, ["None yet. Click ❤ on a card."]) as HTMLElement;
  }

  const list = createElement("ul", { class: "favorites-list" }) as HTMLElement;
  stateRef.favorites.forEach((id) => {
    const farm = farmIndex.get(String(id));
    if (farm) {
      list.append(createElement("li", {}, [farm.name || "Unnamed Farm"]));
    }
  });

  return list;
}

function buildRatingsContent(farms: Farm[]): HTMLElement {
  const top = getTopRated(farms);

  if (!top.length) {
    return createElement("p", {}, ["No ratings yet."]) as HTMLElement;
  }

  const wrapper = createElement("div", { class: "ratings-list" }) as HTMLElement;
  top.forEach((f) => {
    const rating = f.rating ?? 0;
    const rounded = Math.min(5, Math.max(0, Math.round(rating)));
    const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

    wrapper.append(
      createElement("div", { class: "rating" }, [
        createElement("strong", {}, [f.name || "Unnamed Farm"]),
        createElement("span", { class: "rating-stars" }, [stars])
      ])
    );
  });

  return wrapper;
}

function buildMapContent(): HTMLElement {
  return createElement("div", { class: "farm__map-placeholder" }, [
    "Map integration point"
  ]) as HTMLElement;
}

// ---------- Sidebar Controller ----------

interface SidebarController {
  container: HTMLElement;
  render: (allFarms: Farm[], filteredFarms: Farm[]) => void;
}

function Sidebar(isLoggedIn: boolean, stateRef: AppState): SidebarController {
  // Persistent container element for layout stability across renders
  const container = createElement("aside", { class: "farm-sidebar-wrapper" }) as HTMLElement;

  function render(allFarms: Farm[], filteredFarms: Farm[]) {
    const ctaContainer = createElement("div", { class: "cta-wrapper" }) as HTMLElement;
    renderCTAFarm(ctaContainer);

    const weatherContainer = createElement("div", { class: "weather-wrapper" }) as HTMLElement;
    renderWeatherWidget(weatherContainer);

    const featuredContainer = createElement("div", { class: "featured-wrapper" }) as HTMLElement;
    if (allFarms.length) {
      renderFeaturedFarm(featuredContainer, allFarms[0]);
    }

    const statsContainer = createElement("div", { class: "stats-wrapper" }) as HTMLElement;
    renderFarmStats(statsContainer, filteredFarms);

    const favoritesContent = buildFavoritesContent(isLoggedIn, stateRef);
    const ratingsContent = buildRatingsContent(filteredFarms);

    const sections = [
      { content: ctaContainer },
      { content: weatherContainer },
      { title: "Farm Map", content: buildMapContent(), className: "farm__map" },
      featuredContainer.hasChildNodes() && { title: "Featured Farm", content: featuredContainer },
      statsContainer.hasChildNodes() && { title: "Directory Stats", content: statsContainer },
      favoritesContent && { title: "Favorites", content: favoritesContent, className: "farm__favorites" },
      ratingsContent && { title: "Top Rated", content: ratingsContent, className: "farm__ratings" }
    ].filter(Boolean) as Array<{ title?: string; content: HTMLElement; className?: string }>;

    const asideContent = createAsideContent({
      title: "Farm Directory",
      sections,
      showAd: true,
      page: "farms-list",
      adPosition: "aside",
      adOptions: {
        layout: "vertical"
      },
      asContainer: true
    });

    // Safely update contents of persistent container element
    const childToAppend = asideContent instanceof Node ? asideContent : (asideContent as any)?.container;
    container.replaceChildren(childToAppend || asideContent);
  }

  return {
    container,
    render
  };
}

// ---------- Main Entry ----------

export async function displayFarms(content: HTMLElement | null, loggedIn: boolean): Promise<void> {
  if (!content) return;

  content.replaceChildren();

  const state = createInitialState();
  const sentinel = createElement("div", { class: "farm__sentinel" }) as HTMLElement;

  const toggleFavorite: ToggleFavoriteCallback = (farmId: string | number) => {
    const id = String(farmId);

    if (state.favorites.has(id)) {
      state.favorites.delete(id);
    } else {
      state.favorites.add(id);
    }

    try {
      localStorage.setItem(
        "favFarms",
        JSON.stringify(Array.from(state.favorites))
      );
    } catch (e) {
      console.warn("Could not save favorites to localStorage", e);
    }

    commit();
  };

  const grid = Grid(loggedIn, toggleFavorite);
  const sidebar = Sidebar(loggedIn, state);

  function commit(): void {
    const visible = applyFiltersAndSort(state.farms, state);
    grid.render(visible);
    sidebar.render(state.farms, visible);
  }

  const filters = createFilterControls(state, commit);

  // Initial state synchronization before mounting to layout
  commit();

  const layout = createMainLayout({
    mainContent: [filters, grid.container, sentinel],
    asideContent: sidebar.container,
    pageClass: "farm-page",
    showMainAd: true,
    mainAdPlacement: "top"
  });

  const pageContainer = createElement("div", { class: "farmspage" }, [layout]);
  content.append(pageContainer);

  const observer = new IntersectionObserver(onIntersect, {
    rootMargin: "200px"
  });

  observer.observe(sentinel);

  await loadNextPage();
  commit();

  async function loadNextPage(): Promise<void> {
    if (state.isLoading || !state.hasMore) return;

    state.isLoading = true;
    const batch = await fetchFarms(state.page);

    if (batch.length) {
      state.farms.push(...batch);
      state.page += 1;
      if (batch.length < PAGE_SIZE) {
        state.hasMore = false;
        observer.disconnect();
      }
    } else {
      state.hasMore = false;
      observer.disconnect();
    }

    state.isLoading = false;
  }

  async function onIntersect(entries: IntersectionObserverEntry[]): Promise<void> {
    if (!entries.some((e) => e.isIntersecting)) return;

    const prevCount = state.farms.length;
    await loadNextPage();

    if (state.farms.length !== prevCount) {
      commit();
    }
  }
}