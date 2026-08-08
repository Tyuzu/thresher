import { createUserControls } from "../farm/displayFarmHelpers.js";
import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";
import { navigate } from "../../../routes.js";
import Imagex from "../../../components/base/Imagex.js";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Notify from "../../../components/ui/Notify.mjs";
import Button from "../../../components/base/Button.js";

/**
 * Creates a lightweight debounced function wrapper.
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Main entry function to fetch and display crop listings.
 *
 * @param {HTMLElement} content - Container node to populate.
 * @param {string|number} cropID - Unique identifier for the crop.
 * @param {boolean} isLoggedIn - Current session authentication state.
 */
export async function displayCrop(content, cropID, isLoggedIn) {
  const container = createElement("div", { class: "croppage" });
  content.replaceChildren(container);

  try {
    const resp = await apiFetch(`/crops/crop/${cropID}?page=1&limit=100`);
    if (!resp?.success || !Array.isArray(resp?.listings) || resp.listings.length === 0) {
      Notify("No listings found for this crop.", { type: "error", dismissible: true });
      return;
    }

    const listings = resp.listings;

    // 1. Header UI
    const header = createElement("header", { class: "crop-header" }, [
      createElement(
        "h1",
        {
          class: "crop-title",
          events: { click: () => navigate(`/aboutcrop/${cropID}`) },
          style: { fontSize: "2rem", cursor: "pointer" }
        },
        [`${resp.name || "Crop"} (${resp.category || "Uncategorized"})`]
      ),
      createElement("p", { class: "crop-meta" }, [`Total Listings: ${resp.total ?? listings.length}`])
    ]);

    // 2. Setup Filters & Listings Wrapper
    const toggleFiltersBtn = Button("Filters", "button", {}, "toggle-filters-btn buttonx");
    const filterForm = createFilterForm();
    const listingsWrapper = createElement("section", { class: "crop-listings" });

    // 3. Render Handler
    const renderListings = (data) => {
      listingsWrapper.replaceChildren();
      if (!data || data.length === 0) {
        listingsWrapper.appendChild(
          createElement("p", { class: "no-results" }, ["No listings match the selected filters."])
        );
        return;
      }

      const fragment = document.createDocumentFragment();
      data.forEach((listing) => {
        fragment.appendChild(createListingCard(listing, resp.name, isLoggedIn));
      });
      listingsWrapper.appendChild(fragment);
    };

    // Initial Population
    renderListings(listings);

    // 4. Interaction Binding
    setupFilterInteractions({
      filterForm,
      toggleFiltersBtn,
      listings,
      onFiltered: renderListings
    });

    container.append(header, toggleFiltersBtn, filterForm, listingsWrapper);
  } catch (err) {
    Notify(err?.message || "Failed to load crop details.", { type: "error", dismissible: true });
  }
}

/**
 * Factory function to build the filtering form layout.
 */
function createFilterForm() {
  const fields = [
    { id: "filter-location", label: "Location", type: "text", placeholder: "e.g. Nagoya" },
    { id: "filter-breed", label: "Breed", type: "text", placeholder: "e.g. Koshihikari" },
    { id: "filter-min-price", label: "Price Min (¥/kg)", type: "number", placeholder: "Min", min: 0 },
    { id: "filter-max-price", label: "Price Max (¥/kg)", type: "number", placeholder: "Max", min: 0 },
    { id: "filter-min-qty", label: "Qty Min (Kg)", type: "number", placeholder: "Min", min: 0 },
    { id: "filter-max-qty", label: "Qty Max (Kg)", type: "number", placeholder: "Max", min: 0 },
    { id: "filter-harvest", label: "Harvest Date", type: "date" }
  ];

  const filterRows = fields.map((f) =>
    createElement("div", { class: "filter-row" }, [
      createElement("label", { for: f.id }, [f.label]),
      createElement("input", {
        type: f.type,
        id: f.id,
        placeholder: f.placeholder || "",
        ...(f.min !== undefined && { min: f.min })
      })
    ])
  );

  return createElement(
    "form",
    { class: "filter-controls", "aria-label": "Filter crop listings" },
    [
      createElement("fieldset", {}, [
        createElement("legend", {}, ["Filters"]),
        ...filterRows
      ]),
      createElement("div", { class: "filter-actions" }, [
        createElement("button", { type: "button", id: "apply-filters" }, ["Apply"]),
        createElement("button", { type: "button", id: "reset-filters" }, ["Reset"])
      ])
    ]
  );
}

/**
 * Handles input change handlers, filtering calculations, and toggle mechanics.
 */
function setupFilterInteractions({ filterForm, toggleFiltersBtn, listings, onFiltered }) {
  const inputs = {
    location: filterForm.querySelector("#filter-location"),
    breed: filterForm.querySelector("#filter-breed"),
    minPrice: filterForm.querySelector("#filter-min-price"),
    maxPrice: filterForm.querySelector("#filter-max-price"),
    minQty: filterForm.querySelector("#filter-min-qty"),
    maxQty: filterForm.querySelector("#filter-max-qty"),
    harvestDate: filterForm.querySelector("#filter-harvest")
  };

  const applyButton = filterForm.querySelector("#apply-filters");
  const resetButton = filterForm.querySelector("#reset-filters");

  if (Object.values(inputs).some((el) => !el) || !applyButton || !resetButton) {
    Notify("Unable to initialize crop filters.", { type: "error", dismissible: true });
    return;
  }

  const applyFilters = () => {
    const filters = {
      location: inputs.location.value.trim().toLowerCase(),
      breed: inputs.breed.value.trim().toLowerCase(),
      minPrice: parseFloat(inputs.minPrice.value) || null,
      maxPrice: parseFloat(inputs.maxPrice.value) || null,
      minQty: parseFloat(inputs.minQty.value) || null,
      maxQty: parseFloat(inputs.maxQty.value) || null,
      harvestDate: inputs.harvestDate.value || null
    };

    if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
      Notify("Invalid price range (min > max).", { type: "warning", dismissible: true });
      return;
    }
    if (filters.minQty && filters.maxQty && filters.minQty > filters.maxQty) {
      Notify("Invalid quantity range (min > max).", { type: "warning", dismissible: true });
      return;
    }

    const filteredListings = listings.filter((listing) => {
      const locationMatch = !filters.location || (listing?.location || "").toLowerCase().includes(filters.location);
      const breedMatch = !filters.breed || (listing?.breed || "").toLowerCase().includes(filters.breed);

      const priceMatch =
        (!filters.minPrice || (listing?.pricePerKg ?? 0) >= filters.minPrice) &&
        (!filters.maxPrice || (listing?.pricePerKg ?? 0) <= filters.maxPrice);

      const qtyMatch =
        (!filters.minQty || (listing?.availableQtyKg ?? 0) >= filters.minQty) &&
        (!filters.maxQty || (listing?.availableQtyKg ?? 0) <= filters.maxQty);

      let harvestMatch = true;
      if (filters.harvestDate) {
        if (!listing?.harvestDate) {
          harvestMatch = false;
        } else {
          const parsed = new Date(listing.harvestDate);
          harvestMatch = !isNaN(parsed.getTime()) && parsed.toISOString().split("T")[0] === filters.harvestDate;
        }
      }

      return locationMatch && breedMatch && priceMatch && qtyMatch && harvestMatch;
    });

    onFiltered(filteredListings);
  };

  const debouncedApply = debounce(applyFilters, 250);

  // Live input filtering
  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", debouncedApply);
  });

  const resetFilters = () => {
    filterForm.reset();
    onFiltered(listings);
    filterForm.classList.remove("open");
  };

  toggleFiltersBtn.addEventListener("click", () => filterForm.classList.toggle("open"));
  applyButton.addEventListener("click", () => {
    applyFilters();
    filterForm.classList.remove("open");
  });
  resetButton.addEventListener("click", resetFilters);

  filterForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
      filterForm.classList.remove("open");
    }
  });
}

/**
 * Component factory to build individual listing card elements.
 */
function createListingCard(listing, cropName, isLoggedIn) {
  const imageSrc = resolveImagePath(EntityType.CROP, PictureType.THUMB, listing?.banner);
  const farmName = listing?.farmName || "Unnamed Farm";

  const imageSection = createElement("div", { class: "listing-image" }, [
    Imagex({ src: imageSrc, alt: listing?.breed || farmName, loading: "lazy" })
  ]);

  const detailRows = [
    createElement("h3", { class: "farm-link" }, [
      createElement(
        "a",
        { events: { click: () => navigate(`/farm/${listing.farmid}`) } },
        [farmName]
      )
    ]),
    createElement("p", {}, [`Breed: ${listing?.breed || "Not specified"}`]),
    createElement("p", {}, [`Location: ${listing?.location || "Unknown"}`]),
    createElement("p", {}, [`Price: ₹${Number(listing?.pricePerKg || 0).toLocaleString()}/${listing?.unit || "kg"}`]),
    createElement("p", {}, [`Available: ${listing?.availableQtyKg ?? 0} ${listing?.unit || "kg"}`]),
    createElement("p", {}, [`Inventory Value: ₹${Number(listing?.inventoryValue || 0).toLocaleString()}`]),
    createElement("p", {}, [`Status: ${listing?.outOfStock ? "Out of Stock" : getStockStatus(listing?.availableQtyKg || 0)}`]),
    createElement("p", {}, [`Featured: ${listing?.featured ? "Yes" : "No"}`]),
    createElement("p", {}, [`Rating: ${listing?.avgRating || 0} (${listing?.reviewCount || 0} reviews)`]),
    createElement("p", {}, [`Favorites: ${listing?.favoritesCount || 0}`]),
    createElement("p", {}, [`Harvest Date: ${listing?.harvestDate ? new Date(listing.harvestDate).toLocaleDateString() : "N/A"}`]),
    createElement("p", {}, [`Planted Date: ${listing?.plantedDate ? new Date(listing.plantedDate).toLocaleDateString() : "N/A"}`]),
    createElement("p", {}, [`Last Sold: ${listing?.lastSoldAt ? formatRelativeDate(listing.lastSoldAt) : "Never"}`]),
    createElement("p", {}, [`Availability: ${formatAvailability(listing?.availability)}`]),
    createElement("p", {}, [`Phone: ${listing?.phone || "N/A"}`]),
    listing?.tags?.length ? createElement("p", {}, [`Tags: ${listing.tags.join(", ")}`]) : null
  ].filter(Boolean);

  const detailsSection = createElement("div", { class: "listing-details" }, detailRows);

  const cropData = {
    name: cropName,
    cropid: listing?.cropid,
    pricePerKg: listing?.pricePerKg,
    unit: "kg",
    breed: listing?.breed,
    quantity: listing?.availableQtyKg ?? 0
  };

  const controls = createUserControls(
    cropData,
    farmName,
    listing?.farmid,
    isLoggedIn,
    listing?.availableQtyKg,
    listing?.cropid
  );

  const controlsSection = createElement("div", { class: "listing-controls" }, controls);

  return createElement("div", { class: "listing-card" }, [
    imageSection,
    createElement("div", { class: "listing-content" }, [detailsSection, controlsSection])
  ]);
}

/**
 * Decodes availability hours object mapping into a human-readable string.
 */
function formatAvailability(availability) {
  if (!availability || typeof availability !== "object") {
    return "N/A";
  }

  const activeDays = Object.entries(availability)
    .filter(([_, value]) => value && value.enabled)
    .map(([day, value]) => {
      const capitalized = day.charAt(0).toUpperCase() + day.slice(1);
      return `${capitalized}: ${value.from || ""}-${value.to || ""}`;
    });

  return activeDays.length > 0 ? activeDays.join(", ") : "Closed";
}

/**
 * Calculates human-readable elapsed relative time.
 */
function formatRelativeDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";

  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

/**
 * Maps numerical stock amounts to descriptive state strings.
 */
function getStockStatus(qty) {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  if (qty <= 20) return "Limited Stock";
  return "In Stock";
}