import { createElement } from "../../../components/createElement.js";

const PRICE_DATA = [
    { crop: "Wheat", category: "Grains", market: "Pune APMC", district: "Pune", state: "Maharashtra", min: 2350, modal: 2450, max: 2550, trend: 2.4, updated: "10 mins ago" },
    { crop: "Onion", category: "Vegetables", market: "Lasalgaon", district: "Nashik", state: "Maharashtra", min: 1650, modal: 1800, max: 2000, trend: -5.1, updated: "6 mins ago" },
    { crop: "Tomato", category: "Vegetables", market: "Delhi Mandi", district: "Delhi", state: "Delhi", min: 900, modal: 1200, max: 1500, trend: 1.6, updated: "12 mins ago" },
    { crop: "Cotton", category: "Oilseeds", market: "Akola", district: "Akola", state: "Maharashtra", min: 7000, modal: 7200, max: 7400, trend: 0, updated: "20 mins ago" },
    { crop: "Soybean", category: "Legumes", market: "Indore", district: "Indore", state: "Madhya Pradesh", min: 4800, modal: 4950, max: 5100, trend: 3.2, updated: "8 mins ago" }
];

const state = {
    search: "",
    category: "All",
    view: "grid", 
    sortBy: "default" 
};

let appContainer;
let gridContainer;
let searchInputRef;

const categories = ["All", ...new Set(PRICE_DATA.map(x => x.category))];
const trendingCrops = ["Onion", "Wheat", "Tomato"];

function getProcessedData() {
    let result = PRICE_DATA.filter(item => {
        const matchesSearch = item.crop.toLowerCase().includes(state.search) || 
                              item.market.toLowerCase().includes(state.search) ||
                              item.district.toLowerCase().includes(state.search);
        const matchesCategory = state.category === "All" || item.category === state.category;
        return matchesSearch && matchesCategory;
    });

    if (state.sortBy === "high-low") result.sort((a, b) => b.modal - a.modal);
    if (state.sortBy === "low-high") result.sort((a, b) => a.modal - b.modal);
    if (state.sortBy === "trend") result.sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend));

    return result;
}

function createHeaderComponent() {
    const title = createElement("h1", { class: "mp-title" }, ["Live Mandi Market Prices"]);
    
    searchInputRef = createElement("input", {
        type: "text",
        placeholder: "Search crops, wholesale markets or districts...",
        class: "mp-search-input",
        value: state.search,
        events: {
            input: e => {
                state.search = e.target.value.toLowerCase();
                renderGrid();
            }
        }
    });

    const suggestionLabel = createElement("span", { class: "mp-suggest-label" }, ["Trending:"]);
    const suggestionContainer = createElement("div", { class: "mp-suggest-box" }, [
        suggestionLabel,
        ...trendingCrops.map(crop => createElement("button", {
            class: "mp-suggest-pill",
            events: {
                click: () => {
                    state.search = crop.toLowerCase();
                    searchInputRef.value = crop;
                    renderGrid();
                }
            }
        }, [crop]))
    ]);

    const searchWrapper = createElement("div", { class: "mp-search-wrapper" }, [searchInputRef, suggestionContainer]);

    const sortDropdown = createElement("select", {
        class: "mp-sort-select",
        events: {
            change: e => {
                state.sortBy = e.target.value;
                renderGrid();
            }
        }
    }, [
        createElement("option", { value: "default" }, ["Sort: Default"]),
        createElement("option", { value: "high-low" }, ["Price: High to Low"]),
        createElement("option", { value: "low-high" }, ["Price: Low to High"]),
        createElement("option", { value: "trend" }, ["Highest Volatility"])
    ]);

    const tabsWrapper = createElement("div", { class: "mp-tabs-wrapper" });
    categories.forEach(cat => {
        const btn = createElement("button", {
            class: `mp-filter-btn ${state.category === cat ? "active" : ""}`,
            events: {
                click: (e) => {
                    state.category = cat;
                    document.querySelectorAll(".mp-filter-btn").forEach(b => b.classList.remove("active"));
                    e.target.classList.add("active");
                    renderGrid();
                }
            }
        }, [cat]);
        tabsWrapper.appendChild(btn);
    });

    const toggleBtn = createElement("button", {
        class: "mp-view-toggle",
        events: {
            click: (e) => {
                state.view = state.view === "grid" ? "list" : "grid";
                e.target.textContent = state.view === "grid" ? "Horizontal List View" : "Compact Grid View";
                renderGrid();
            }
        }
    }, [state.view === "grid" ? "Horizontal List View" : "Compact Grid View"]);
    
    const controlBar = createElement("div", { class: "mp-control-bar" }, [tabsWrapper, sortDropdown, toggleBtn]);

    return createElement("div", { class: "mp-dashboard-header" }, [title, searchWrapper, controlBar]);
}

function createPriceCard(item) {
    const isPositive = item.trend >= 0;
    const trendClass = item.trend === 0 ? "neutral" : isPositive ? "positive" : "negative";
    const trendIcon = item.trend === 0 ? "•" : isPositive ? "▲" : "▼";
    const trendPrefix = isPositive && item.trend > 0 ? "+" : "";
    const cardBorderHighlight = `border-trend-${trendClass}`;

    const badge = createElement("span", { class: "mp-badge" }, [item.category]);
    const time = createElement("span", { class: "mp-time" }, [item.updated]);
    const cardHeader = createElement("div", { class: "mp-card-meta" }, [badge, time]);

    const cropName = createElement("h3", { class: "mp-crop-name" }, [item.crop]);
    const location = createElement("p", { class: "mp-location-text" }, [`${item.market}, ${item.district}`]);
    const infoSec = createElement("div", { class: "mp-info-section" }, [cropName, location]);

    const label = createElement("span", { class: "mp-label" }, ["Avg Market Rate"]);
    const modalPrice = createElement("div", { class: "mp-modal-price" }, [`₹${item.modal.toLocaleString("en-IN")}`]);
    const trendPill = createElement("span", { class: `mp-trend-pill ${trendClass}` }, [`${trendIcon} ${trendPrefix}${item.trend}%`]);
    const primaryPriceWrapper = createElement("div", { class: "mp-modal-wrapper" }, [label, modalPrice, trendPill]);

    // Slider Math calculations
    const totalRange = item.max - item.min;
    const directOffset = item.modal - item.min;
    const trackingPercentage = totalRange > 0 ? (directOffset / totalRange) * 100 : 50;

    const visualTrackIndicator = createElement("div", { 
        class: "mp-range-fill-head", 
        styles: { left: `${trackingPercentage}%` } 
    });
    const customProgressBarRangeLine = createElement("div", { class: "mp-range-track-line" }, [visualTrackIndicator]);
    
    // Explicit empty objects passed instead of null to match createElement signatures safely
    const minBound = createElement("span", {}, [`₹${item.min.toLocaleString("en-IN")}`]);
    const maxBound = createElement("span", {}, [`₹${item.max.toLocaleString("en-IN")}`]);
    const progressLabelContainer = createElement("div", { class: "mp-range-labels-wrapper" }, [minBound, maxBound]);
    
    const contextRangeGaugeComponent = createElement("div", { class: "mp-range-slider-component" }, [
        createElement("span", { class: "mp-label" }, ["Market Spread Location"]),
        customProgressBarRangeLine,
        progressLabelContainer
    ]);

    const priceMatrix = createElement("div", { class: "mp-price-matrix" }, [primaryPriceWrapper, contextRangeGaugeComponent]);

    return createElement("div", { class: `mp-price-card ${state.view}-layout ${cardBorderHighlight}` }, [cardHeader, infoSec, priceMatrix]);
}

function createEmptyState() {
    return createElement("button", { 
        class: "mp-empty-state-reset",
        events: {
            click: () => {
                state.search = "";
                state.category = "All";
                state.sortBy = "default";
                const filterBtns = document.querySelectorAll(".mp-filter-btn");
                filterBtns.forEach(b => b.classList.remove("active"));
                const initialTab = document.querySelector(".mp-filter-btn");
                if (initialTab) initialTab.classList.add("active");
                if (searchInputRef) searchInputRef.value = "";
                renderGrid();
            }
        }
    }, ["No market data matched. Click here to clear all filters."]);
}

function renderGrid() {
    if (!gridContainer) return;
    
    gridContainer.className = `mp-grid-container layout-${state.view}`;
    gridContainer.innerHTML = "";

    const activeDataset = getProcessedData();

    if (activeDataset.length === 0) {
        gridContainer.appendChild(createEmptyState());
        return;
    }

    activeDataset.forEach(item => {
        gridContainer.appendChild(createPriceCard(item));
    });
}

export function displayBazarBhav(rootContainer) {
    if (!rootContainer) return;
    appContainer = rootContainer;
    appContainer.innerHTML = ""; 
    
    const dashboardHeader = createHeaderComponent();
    gridContainer = createElement("div", { class: "mp-grid-container" });

    appContainer.appendChild(dashboardHeader);
    appContainer.appendChild(gridContainer);

    renderGrid();
}
