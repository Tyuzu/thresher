import { createUserControls } from "../farm/displayFarmHelpers";
import { createElement } from "../../../components/createElement";
import { apiFetch } from "../../../api/api";
import { navigate } from "../../../routes/navigate";
import Imagex from "../../../components/base/Imagex";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths";
import Notify from "../../../components/ui/Notify";
import Button from "../../../components/base/Button";

// --- Types & Interfaces ---

export interface AvailabilityDay {
  enabled?: boolean;
  from?: string;
  to?: string;
}

export type AvailabilityMap = Record<string, AvailabilityDay>;

export interface CropListing {
  cropid: string;
  farmid: string;
  farmName?: string;
  breed?: string;
  banner?: string;
  location?: string;
  pricePerKg?: number;
  unit?: string;
  availableQtyKg?: number;
  inventoryValue?: number;
  outOfStock?: boolean;
  featured?: boolean;
  avgRating?: number;
  reviewCount?: number;
  favoritesCount?: number;
  harvestDate?: string;
  plantedDate?: string;
  lastSoldAt?: string;
  availability?: AvailabilityMap;
  phone?: string;
  tags?: string[];
}

export interface CropApiResponse {
  success: boolean;
  name?: string;
  category?: string;
  total?: number;
  listings?: CropListing[];
}

export interface FilterValues {
  location: string;
  breed: string;
  minPrice: number | null;
  maxPrice: number | null;
  minQty: number | null;
  maxQty: number | null;
  harvestDate: string | null;
}

export interface SetupFilterInteractionsParams {
  filterForm: HTMLFormElement;
  toggleFiltersBtn: HTMLElement;
  listings: CropListing[];
  onFiltered: (data: CropListing[]) => void;
}

/**
 * Creates a lightweight debounced function wrapper.
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Main entry function to fetch and display crop listings.
 */
export async function displayCrop(
  content: HTMLElement,
  cropID: string | number,
  isLoggedIn: boolean
): Promise<void> {
  const container = createElement("div", { class: "croppage" }) as HTMLElement;
  content.replaceChildren(container);

  try {
    const resp = await apiFetch<CropApiResponse>(`/crops/crop/${cropID}?page=1&limit=100`);
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
    ]) as HTMLElement;

    // 2. Setup Filters & Listings Wrapper
    const toggleFiltersBtn = Button({ title: "Filters", id: "button", events: {}, classes: "toggle-filters-btn buttonx" }) as HTMLElement;
    const filterForm = createFilterForm();
    const listingsWrapper = createElement("section", { class: "crop-listings" }) as HTMLElement;

    // 3. Render Handler
    const renderListings = (data: CropListing[]): void => {
      listingsWrapper.replaceChildren();
      if (!data || data.length === 0) {
        listingsWrapper.appendChild(
          createElement("p", { class: "no-results" }, ["No listings match the selected filters."]) as HTMLElement
        );
        return;
      }

      const fragment = document.createDocumentFragment();
      data.forEach((listing) => {
        fragment.appendChild(createListingCard(listing, resp.name || "Crop", isLoggedIn));
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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load crop details.";
    Notify(errorMessage, { type: "error", dismissible: true });
  }
}

/**
 * Factory function to build the filtering form layout.
 */
function createFilterForm(): HTMLFormElement {
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
        ...(f.min !== undefined && { min: String(f.min) })
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
  ) as HTMLFormElement;
}

/**
 * Handles input change handlers, filtering calculations, and toggle mechanics.
 */
function setupFilterInteractions({
  filterForm,
  toggleFiltersBtn,
  listings,
  onFiltered
}: SetupFilterInteractionsParams): void {
  const inputs = {
    location: filterForm.querySelector<HTMLInputElement>("#filter-location"),
    breed: filterForm.querySelector<HTMLInputElement>("#filter-breed"),
    minPrice: filterForm.querySelector<HTMLInputElement>("#filter-min-price"),
    maxPrice: filterForm.querySelector<HTMLInputElement>("#filter-max-price"),
    minQty: filterForm.querySelector<HTMLInputElement>("#filter-min-qty"),
    maxQty: filterForm.querySelector<HTMLInputElement>("#filter-max-qty"),
    harvestDate: filterForm.querySelector<HTMLInputElement>("#filter-harvest")
  };

  const applyButton = filterForm.querySelector<HTMLButtonElement>("#apply-filters");
  const resetButton = filterForm.querySelector<HTMLButtonElement>("#reset-filters");

  if (!inputs.location || !inputs.breed || !inputs.minPrice || !inputs.maxPrice ||
    !inputs.minQty || !inputs.maxQty || !inputs.harvestDate || !applyButton || !resetButton) {
    Notify("Unable to initialize crop filters.", { type: "error", dismissible: true });
    return;
  }

  // Type assertion since we validated null checks above
  const validInputs = inputs as Record<keyof typeof inputs, HTMLInputElement>;

  const applyFilters = (): void => {
    const filters: FilterValues = {
      location: validInputs.location.value.trim().toLowerCase(),
      breed: validInputs.breed.value.trim().toLowerCase(),
      minPrice: parseFloat(validInputs.minPrice.value) || null,
      maxPrice: parseFloat(validInputs.maxPrice.value) || null,
      minQty: parseFloat(validInputs.minQty.value) || null,
      maxQty: parseFloat(validInputs.maxQty.value) || null,
      harvestDate: validInputs.harvestDate.value || null
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
  Object.values(validInputs).forEach((input) => {
    input.addEventListener("input", debouncedApply);
  });

  const resetFilters = (): void => {
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

  filterForm.addEventListener("keydown", (e: KeyboardEvent) => {
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
function createListingCard(listing: CropListing, cropName: string, isLoggedIn: boolean): HTMLElement {
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
  ].filter((node): node is HTMLHeadingElement => Boolean(node));

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
    isLoggedIn
  );

  const controlsSection = createElement("div", { class: "listing-controls" }, controls);

  return createElement("div", { class: "listing-card" }, [
    imageSection,
    createElement("div", { class: "listing-content" }, [detailsSection, controlsSection])
  ]) as HTMLElement;
}

/**
 * Decodes availability hours object mapping into a human-readable string.
 */
function formatAvailability(availability?: AvailabilityMap): string {
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
function formatRelativeDate(dateString?: string): string {
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
function getStockStatus(qty: number): string {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 5) return "Low Stock";
  if (qty <= 20) return "Limited Stock";
  return "In Stock";
}