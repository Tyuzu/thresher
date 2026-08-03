import { createElement } from "../../../components/createElement.js";
import { navigate } from "../../../routes/index.js";
import { cropAside } from "./cropAside.js";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";
import { debounce } from "../../../utils/deutils.js";
import Button from "../../../components/base/Button.js";
import { createMainLayout } from "../../../components/layout/mainLayout.js";

function filterAndSortCrops(crops = [], { term, tags, sortBy }) {
  return crops
    .filter(crop =>
      crop.name.toLowerCase().includes(term) &&
      [...tags].every(tag => crop.tags.includes(tag))
    )
    .sort((a, b) =>
      sortBy === "az"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
}

// --- utils ---
function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPriceRange(min, max) {
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

function isSeasonal(crop) {
  const nowMonth = new Date().getMonth() + 1;
  return (crop.seasonMonths || []).includes(nowMonth);
}

// --- card ---
export function renderCropCard(crop, mode = "catalogue") {
  const card = createElement("div", { class: "crop-card" });
  card.addEventListener("click", () => navigate(`/crop/${crop.name.toLowerCase().replace(/\s+/g, "_")}`));
  
  const img = Imagex({
    src: resolveImagePath(EntityType.CROP, PictureType.THUMB, crop.banner),
    alt: crop.name,
    class: "crop-card-image",
    loading: "lazy"
  });

  const title = createElement("h4", {}, [crop.name]);

  // catalogue mode = aggregated across farms
  if (mode === "catalogue") {
    const info = createElement("p", { class: "crop-info" }, [
      `${formatPriceRange(crop.minPrice, crop.maxPrice)} per ${crop.unit} • ${crop.availableCount} listings`
    ]);

    const seasonStatus = isSeasonal(crop)
      ? ["🟢 In Season", "in-season"]
      : ["🔴 Off Season", "off-season"];

    const season = createElement("p", { class: `season-indicator ${seasonStatus[1]}` }, [seasonStatus[0]]);
    const tags = createElement("div", { class: "tag-wrap" },
      (crop.tags || []).map(tag => createElement("span", { class: "tag-pill" }, [tag]))
    );

    const btn = Button("View Farms", "button", {
      click: () => {
        navigate(`/crop/${crop.name.toLowerCase().replace(/\s+/g, "_")}`);
      }
    }, "buttonx");

    const ccon = createElement("div", { class: "nimgcon" }, []);
    ccon.append(title, info, season, tags, btn);
    card.append(img, ccon);
  }

  // listing mode = one farm’s crop
  if (mode === "listing") {
    card.append(
      createElement("p", {}, [`💰 ${formatPrice(crop.price)} per ${crop.unit}`]),
      createElement("p", {}, [`📦 In Stock: ${crop.quantity}`]),
      createElement("p", {}, [`👨‍🌾 Farm: ${crop.farmName || "Unknown"}`])
    );
  }

  return card;
}

// --- Main Renderer ---
export function renderCropInterface(container, cropData) {
  const mainContent = createElement("div", { class: "catalogue-main" });

  mainContent.prepend(createElement("h2", {}, ["All Crops"]));
  const searchBox = createElement("input", {
    type: "text",
    name: "search",
    placeholder: "Search crops…",
    class: "search-box"
  });

  const sortSelect = createElement("select", { class: "sort-box", name: "sortby" }, [
    createElement("option", { value: "az" }, ["A → Z"]),
    createElement("option", { value: "za" }, ["Z → A"])
  ]);

  const controls = createElement("div", { class: "top-controls" }, [
    searchBox, sortSelect
  ]);
  mainContent.append(controls);

  const tabButtons = createElement("div", { class: "tabs" });
  const tabsWrapper = createElement("div", { id: "catalogue-container" });
  mainContent.append(tabButtons, tabsWrapper);

  const tabs = {};
  const activeTags = new Set();
  const categories = Object.keys(cropData);
  const currentTab = categories.length ? categories[0] : null;

  const state = {
    cropData,
    categories,
    currentTab,
    activeTags,
    searchBox,
    sortSelect,
    tabs,
    tabButtons
  };

  categories.forEach((cat, i) => {
    const btn = createElement("button", { class: "buttonx" }, [
      `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${cropData[cat].length})`
    ]);

    if (!cropData[cat].length) {
      btn.disabled = true;
    }

    btn.onclick = () => {
      state.currentTab = cat;
      updateAllTabs(state);
    };

    if (i === 0) {
      btn.classList.add("active");
    }
    tabButtons.appendChild(btn);

    const pane = createElement("div", { class: "tab-content", id: cat });
    tabs[cat] = pane;
    tabsWrapper.appendChild(pane);
  });

  sortSelect.onchange = () => updateAllTabs(state);
  searchBox.addEventListener("input", debounce(() => updateAllTabs(state)));

  updateAllTabs(state);

  const asideContent = cropAside(cropData);

  const layout = createMainLayout({
    mainContent: [mainContent],
    asideContent,
    pageClass: "catalogue-layout"
  });

  container.appendChild(layout);

}

function updateAllTabs(state) {
  const { categories, currentTab, tabButtons, tabs } = state;
  if (!currentTab) {
    console.warn("No crop categories available to render.");
    return;
  }

  updateTab(currentTab, state);
  categories.forEach(cat => {
    const pane = tabs[cat];
    if (pane && pane.style) {
      pane.style.display = cat === currentTab ? "flex" : "none";
    }
  });

  Array.from(tabButtons.children).forEach(btn => {
    const btnCategory = btn.textContent.split(" (")[0].toLowerCase();
    btn.classList.toggle("active", btnCategory === currentTab.toLowerCase());
  });
}

function updateTab(category, state) {
  const { cropData, tabs, searchBox, sortSelect, activeTags } = state;
  let container = tabs[category];

  if (!container) {
    container = createElement("div", { class: "tab-content", id: category });
    tabs[category] = container;
    const wrapper = document.getElementById("catalogue-container");
    if (wrapper) {
      wrapper.appendChild(container);
    }
  }

  if (!container || typeof container.replaceChildren !== "function") {
    console.warn("Skipping updateTab; container missing for category:", category);
    return;
  }
  container.replaceChildren();

  const filtered = filterAndSortCrops(cropData[category], {
    term: searchBox.value.trim().toLowerCase(),
    tags: activeTags,
    sortBy: sortSelect.value
  });

  if (filtered.length === 0) {
    container.appendChild(
      createElement("p", { class: "empty-category" }, ["No crops available."])
    );
  } else {
    filtered.forEach(c => container.appendChild(renderCropCard(c)));
  }
}