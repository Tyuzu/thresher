import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";
import { guessCategoryFromName } from "./displayCropshelpers.js";
import { navigate } from "../../../routes/navigate.js";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";
import { debounce } from "../../../utils/deutils.js";
import Button from "../../../components/base/Button.js";
import { createMainLayout } from "../../../components/layout/mainLayout.js";
import { createAsideContent } from "../../../components/layout/asideLayout.js";

// --- Types & Interfaces ---

export interface Crop {
  name: string;
  minPrice?: number;
  maxPrice?: number;
  availableCount?: number;
  unit?: string;
  banner?: string;
  tags?: string[];
  seasonMonths?: number[];
  price?: number;
  quantity?: number;
  farmName?: string;
}

export type CategorizedCrops = Record<string, Crop[]>;

interface FilterOptions {
  term: string;
  tags: Set<string>;
  sortBy: string;
}

interface InterfaceState {
  cropData: CategorizedCrops;
  categories: string[];
  currentTab: string | null;
  activeTags: Set<string>;
  searchBox: HTMLInputElement;
  sortSelect: HTMLSelectElement;
  tabs: Record<string, HTMLElement>;
  tabButtons: HTMLElement;
}

interface RawCropType {
  Name?: string;
  MinPrice?: number;
  MaxPrice?: number;
  AvailableCount?: number;
  Unit?: string;
  Banner?: string;
}

interface CropsApiResponse {
  cropTypes?: RawCropType[];
}

/**
 * Creates formatted promo items/list configuration for createAsideContent sections.
 */
function createPromoSection(title: string, items: string[]) {
  return {
    title,
    className: "promo-box",
    content: createElement(
      "ul",
      { class: "promo-list" },
      items.map((item) => createElement("li", {}, [item]))
    )
  };
}

export function cropAside(_cropData: CategorizedCrops) {
  return createAsideContent({
    title: "Market Highlights",
    actions: [
      Button({
        title: "Buy Products",
        id: "buyprds-crp-btn",
        events: { click: () => navigate("/products") },
        classes: "action-btn buttonx primary"
      }),

      Button({
        title: "See Recipes",
        id: "recipes-crp-btn",
        events: { click: () => navigate("/recipes") },
        classes: "buttonx secondary"
      }),

      Button({
        title: "List Your Farm",
        id: "newfrm-btn",
        events: { click: () => navigate("/create-farm") },
        classes: "buttonx secondary"
      })
    ],
    sections: [
      createPromoSection("💸 Active Deals", [
        "🧃 Buy 2 kg Tomatoes, get 10% off!",
        "🥭 Fresh Mangoes now ₹40/kg!"
      ]),
      createPromoSection("📅 Seasonal Picks", [
        "🍉 Watermelons are ripe this week",
        "🌽 Baby corn harvest starting soon"
      ]),
      createPromoSection("📊 Crop Trends", [
        "📈 Onion prices up 12% this week",
        "📉 Cauliflower down due to surplus"
      ]),
      createPromoSection("🔔 Announcements", [
        "🛠 Maintenance scheduled this Friday",
        "🚚 New delivery zones added in Karnal"
      ]),
      createPromoSection("📷 Farmer's Showcase", [
        "🏞️ Featured: Ajay’s organic carrot patch",
        "🧑‍🌾 Share your crop stories with us!"
      ])
    ],
    showAd: true,
    adOptions: {
      layout: "vertical"
    }
  });
}

// --- Helpers & Utils ---

function filterAndSortCrops(crops: Crop[] = [], { term, tags, sortBy }: FilterOptions): Crop[] {
  const searchTerm = term.toLowerCase();

  return crops
    .filter(crop => {
      const matchesTerm = crop.name?.toLowerCase().includes(searchTerm);
      const matchesTags = [...tags].every(tag => crop.tags?.includes(tag));
      return matchesTerm && matchesTags;
    })
    .sort((a, b) =>
      sortBy === "az"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
}

function formatPrice(value?: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatPriceRange(min?: number, max?: number): string {
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

function isSeasonal(crop: Crop): boolean {
  const currentMonth = new Date().getMonth() + 1;
  return Array.isArray(crop.seasonMonths) && crop.seasonMonths.includes(currentMonth);
}

function formatCropSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

// --- Component Renderers ---

export function renderCropCard(crop: Crop, mode: "catalogue" | "listing" = "catalogue"): HTMLElement {
  const card = createElement("div", { class: "crop-card" });
  const cropSlug = formatCropSlug(crop.name);

  card.addEventListener("click", () => navigate(`/crop/${cropSlug}`));

  const img = Imagex({
    src: resolveImagePath(EntityType.CROP, PictureType.THUMB, crop.banner),
    alt: crop.name,
    class: "crop-card-image",
    loading: "lazy"
  });

  const title = createElement("h4", {}, [crop.name]);

  if (mode === "catalogue") {
    const info = createElement("p", { class: "crop-info" }, [
      `${formatPriceRange(crop.minPrice, crop.maxPrice)} per ${crop.unit} • ${crop.availableCount} listings`
    ]);

    const inSeason = isSeasonal(crop);
    const seasonLabel = inSeason ? "🟢 In Season" : "🔴 Off Season";
    const seasonClass = inSeason ? "in-season" : "off-season";

    const season = createElement("p", { class: `season-indicator ${seasonClass}` }, [seasonLabel]);
    
    const tags = createElement(
      "div",
      { class: "tag-wrap" },
      (crop.tags || []).map(tag => createElement("span", { class: "tag-pill" }, [tag]))
    );

    const btn = Button({
      title: "View Farms",
      type: "button",
      events: { click: () => navigate(`/crop/${cropSlug}`) },
      classes: "buttonx"
    });

    const contentWrapper = createElement("div", { class: "nimgcon" }) as HTMLElement;
    contentWrapper.append(title, info, season, tags, btn);
    card.append(img, contentWrapper);
  } else if (mode === "listing") {
    card.append(
      title,
      createElement("p", {}, [`💰 ${formatPrice(crop.price)} per ${crop.unit}`]),
      createElement("p", {}, [`📦 In Stock: ${crop.quantity}`]),
      createElement("p", {}, [`👨‍🌾 Farm: ${crop.farmName || "Unknown"}`])
    );
  }

  return card;
}

// --- Interface State Management ---

export function renderCropInterface(container: HTMLElement, cropData: CategorizedCrops): void {
  const mainContent = createElement("div", { class: "catalogue-main" });

  const searchBox = createElement("input", {
    type: "text",
    name: "search",
    placeholder: "Search crops…",
    class: "search-box"
  }) as HTMLInputElement;

  const sortSelect = createElement("select", { class: "sort-box", name: "sortby" }, [
    createElement("option", { value: "az" }, ["A → Z"]),
    createElement("option", { value: "za" }, ["Z → A"])
  ]) as HTMLSelectElement;

  const controls = createElement("div", { class: "top-controls" }, [searchBox, sortSelect]);
  const tabButtons = createElement("div", { class: "tabs" });
  const tabsWrapper = createElement("div", { id: "catalogue-container" });

  mainContent.append(
    createElement("h2", {}, ["All Crops"]),
    controls,
    tabButtons,
    tabsWrapper
  );

  const categories = Object.keys(cropData);
  const state: InterfaceState = {
    cropData,
    categories,
    currentTab: categories[0] || null,
    activeTags: new Set(),
    searchBox,
    sortSelect,
    tabs: {},
    tabButtons
  };

  categories.forEach((cat, index) => {
    const isFirst = index === 0;
    const count = cropData[cat]?.length || 0;
    
    const btn = createElement(
      "button",
      { 
        class: `buttonx ${isFirst ? "active" : ""}`,
        disabled: count === 0
      },
      [`${cat.charAt(0).toUpperCase() + cat.slice(1)} (${count})`]
    ) as HTMLButtonElement;

    btn.onclick = () => {
      state.currentTab = cat;
      updateAllTabs(state);
    };

    tabButtons.appendChild(btn);

    const pane = createElement("div", { class: "tab-content", id: cat });
    state.tabs[cat] = pane;
    tabsWrapper.appendChild(pane);
  });

  sortSelect.onchange = () => updateAllTabs(state);
  searchBox.addEventListener("input", debounce(() => updateAllTabs(state)));

  updateAllTabs(state);

  const layout = createMainLayout({
    mainContent: [mainContent],
    asideContent: cropAside(cropData),
    pageClass: "catalogue-layout",
    showMainAd: true,
    mainAdPlacement: "top"
  });

  container.appendChild(layout);
}

function updateAllTabs(state: InterfaceState): void {
  const { categories, currentTab, tabButtons, tabs } = state;
  if (!currentTab) return;

  updateTab(currentTab, state);

  categories.forEach(cat => {
    const pane = tabs[cat];
    if (pane) {
      pane.style.display = cat === currentTab ? "flex" : "none";
    }
  });

  Array.from(tabButtons.children).forEach(btn => {
    const htmlBtn = btn as HTMLElement;
    const btnCategory = htmlBtn.dataset.category || htmlBtn.textContent?.split(" (")[0].trim().toLowerCase() || "";
    htmlBtn.classList.toggle("active", btnCategory === currentTab.toLowerCase());
  });
}

function updateTab(category: string, state: InterfaceState): void {
  const { cropData, tabs, searchBox, sortSelect, activeTags } = state;
  const container = tabs[category];

  if (!container) return;

  container.replaceChildren();

  const filtered = filterAndSortCrops(cropData[category], {
    term: searchBox.value.trim(),
    tags: activeTags,
    sortBy: sortSelect.value
  });

  if (filtered.length === 0) {
    container.appendChild(
      createElement("p", { class: "empty-category" }, ["No crops available."])
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(crop => fragment.appendChild(renderCropCard(crop)));
  container.appendChild(fragment);
}

// --- Main Entrypoint ---

export async function displayCrops(content: HTMLElement): Promise<void> {
  const contentContainer = createElement("div", { class: "cropspage" });
  content.replaceChildren(contentContainer);

  const categorized: CategorizedCrops = {};

  try {
    const response = await apiFetch<CropsApiResponse>("/crops/types");

    if (!response?.cropTypes || !Array.isArray(response.cropTypes)) {
      throw new Error("Invalid response format: 'cropTypes' array missing");
    }

    response.cropTypes.forEach((raw: RawCropType) => {
      if (!raw.Name) return;

      const crop: Crop = {
        name: raw.Name,
        minPrice: raw.MinPrice,
        maxPrice: raw.MaxPrice,
        availableCount: raw.AvailableCount,
        unit: raw.Unit,
        banner: raw.Banner || "placeholder.jpg",
        tags: [],
        seasonMonths: []
      };

      const category = guessCategoryFromName(crop.name);
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(crop);
    });
  } catch (err) {
    console.error("Error fetching crops:", err);
  }

  renderCropInterface(contentContainer, categorized);
}