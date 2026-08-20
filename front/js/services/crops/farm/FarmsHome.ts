import { createElement } from "../../../components/createElement.ts";
import { apiFetch } from "../../../api/api.ts";
import {
  renderFarmCards,
  renderFeaturedFarm,
  renderCTAFarm,
  renderWeatherWidget,
  renderFarmStats,
} from "./farmListHelpers.ts";
import {
  createFilterControls,
  applyFiltersAndSort,
} from "./farmFilters.ts";
import { createMainLayout } from "../../../components/layout/mainLayout.ts";
import { createAsideContent } from "../../../components/layout/asideLayout.ts";

// Config
const PAGE_SIZE = 10;

/**
 * Creates a fresh state instance to prevent cross-request state pollution.
 */
function createInitialState() {
  let favorites = new Set();
  try {
    favorites = new Set(JSON.parse(localStorage.getItem("favFarms") || "[]"));
  } catch {
    favorites = new Set();
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
    sortDir: "",
  };
}

// ---------- Data helpers ----------

function indexFarmsById(farms) {
  const map = new Map();
  farms.forEach((f) => {
    if (f && f.id !== undefined) {
      map.set(String(f.id), f);
    }
  });
  return map;
}

function getTopRated(farms, limit = 3) {
  return [...farms]
    .filter((f) => typeof f?.rating === "number")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

// ---------- API ----------

async function fetchFarms(page) {
  try {
    const res = await apiFetch(`/farms?page=${page}&limit=${PAGE_SIZE}`);
    return Array.isArray(res?.farms) ? res.farms : [];
  } catch (error) {
    console.error("Failed to fetch farms:", error);
    return [];
  }
}

// ---------- Grid ----------

function Grid(isLoggedIn, toggleFavorite) {
  const container = createElement("div", { class: "farm__grid" });

  return {
    container,
    render(farms) {
      container.replaceChildren();

      if (!farms.length) {
        container.append(
          createElement("p", { class: "farm__empty-message" }, ["No farms found."])
        );
        return;
      }

      renderFarmCards(farms, container, isLoggedIn, toggleFavorite);
    },
  };
}

// ---------- Sidebar Helper Builders ----------

function buildFavoritesContent(isLoggedIn, stateRef) {
  if (!isLoggedIn) return null;

  const farmIndex = indexFarmsById(stateRef.farms);

  if (stateRef.favorites.size === 0) {
    return createElement("p", {}, ["None yet. Click ❤ on a card."]);
  }

  const list = createElement("ul", { class: "favorites-list" });
  stateRef.favorites.forEach((id) => {
    const farm = farmIndex.get(String(id));
    if (farm) {
      list.append(createElement("li", {}, [farm.name]));
    }
  });

  return list;
}

function buildRatingsContent(farms) {
  const top = getTopRated(farms);

  if (!top.length) {
    return createElement("p", {}, ["No ratings yet."]);
  }

  const wrapper = createElement("div", { class: "ratings-list" });
  top.forEach((f) => {
    const rounded = Math.min(5, Math.max(0, Math.round(f.rating)));
    const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);

    wrapper.append(
      createElement("div", { class: "rating" }, [
        createElement("strong", {}, [f.name]),
        createElement("span", { class: "rating-stars" }, [stars]),
      ])
    );
  });

  return wrapper;
}

function buildMapContent() {
  return createElement("div", { class: "farm__map-placeholder" }, [
    "Map integration point",
  ]);
}

// ---------- Sidebar Controller ----------

function Sidebar(isLoggedIn, stateRef) {
  // Persistent container element for layout stability across renders
  const container = createElement("aside", { class: "farm-sidebar-wrapper" });

  function render(allFarms, filteredFarms) {
    const ctaContainer = createElement("div", { class: "cta-wrapper" });
    renderCTAFarm(ctaContainer);

    const weatherContainer = createElement("div", { class: "weather-wrapper" });
    renderWeatherWidget(weatherContainer);

    const featuredContainer = createElement("div", { class: "featured-wrapper" });
    if (allFarms.length) {
      renderFeaturedFarm(featuredContainer, allFarms[0]);
    }

    const statsContainer = createElement("div", { class: "stats-wrapper" });
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
      ratingsContent && { title: "Top Rated", content: ratingsContent, className: "farm__ratings" },
    ].filter(Boolean);

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
    const childToAppend = asideContent instanceof Node ? asideContent : asideContent?.container;
    container.replaceChildren(childToAppend || asideContent);
  }

  return {
    container,
    render,
  };
}

// ---------- Main Entry ----------

export async function displayFarms(content, loggedIn) {
  content.replaceChildren();

  const state = createInitialState();
  const sentinel = createElement("div", { class: "farm__sentinel" });

  const grid = Grid(loggedIn, toggleFavorite);
  const sidebar = Sidebar(loggedIn, state);

  function commit() {
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
    mainAdPlacement: "top",
  });

  const pageContainer = createElement("div", { class: "farmspage" }, [layout]);
  content.append(pageContainer);

  const observer = new IntersectionObserver(onIntersect, {
    rootMargin: "200px",
  });

  observer.observe(sentinel);

  await loadNextPage();
  commit();

  async function loadNextPage() {
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

  async function onIntersect(entries) {
    if (!entries.some((e) => e.isIntersecting)) return;

    const prevCount = state.farms.length;
    await loadNextPage();

    if (state.farms.length !== prevCount) {
      commit();
    }
  }

  function toggleFavorite(farmId) {
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
  }
}