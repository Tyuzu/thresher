import { displayCropCard } from "../crop/displayCropCard.js";
import { fetchCategoryItems } from "../api.js";

export interface CategoryFilters {
  minPrice?: string | number;
  maxPrice?: string | number;
  inStock?: boolean;
  region?: string;
  lat?: string | number;
  lng?: string | number;
  [key: string]: any;
}

export interface CropItem {
  id?: string | number;
  name?: string;
  category?: string;
  price?: number;
  [key: string]: any;
}

export interface CategoryItemsResponse {
  success: boolean;
  crops?: CropItem[];
  [key: string]: any;
}

/**
 * Renders items for a specific category into a container element with filtering support.
 *
 * @param container - DOM node where items should be rendered.
 * @param category - Category identifier or name.
 * @param filters - Optional filters for querying items.
 */
export async function renderCategoryItems(
  container: HTMLElement | null,
  category: string,
  filters: CategoryFilters = {}
): Promise<void> {
  if (!container) return;

  // Clear previous content cleanly
  container.replaceChildren();

  const loadingState = document.createElement("p");
  loadingState.className = "category-items__loading";
  loadingState.textContent = "Loading...";
  container.append(loadingState);

  try {
    const params = new URLSearchParams();

    if (category) params.append("category", category);
    if (filters.minPrice !== undefined && filters.minPrice !== "") {
      params.append("minPrice", String(filters.minPrice));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== "") {
      params.append("maxPrice", String(filters.maxPrice));
    }
    if (filters.inStock) params.append("inStock", "true");
    if (filters.region) params.append("region", String(filters.region));
    if (filters.lat !== undefined && filters.lat !== "") {
      params.append("lat", String(filters.lat));
    }
    if (filters.lng !== undefined && filters.lng !== "") {
      params.append("lng", String(filters.lng));
    }

    const queryString = params.toString();

    const res = (await fetchCategoryItems(queryString)) as CategoryItemsResponse;

    if (!res?.success || !Array.isArray(res?.crops) || res.crops.length === 0) {
      container.replaceChildren();
      const emptyState = document.createElement("p");
      emptyState.className = "category-items__empty";
      emptyState.textContent = "No items found in this category.";
      container.append(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();

    res.crops.forEach((crop: CropItem) => {
      const cardData = {
        name: crop.name || "",
        price: Number(crop.price || 0),
        unit: (crop as any).unit || "kg",
        quantity: Number((crop as any).quantity || 0),
        banner: (crop as any).banner,
        farmName: (crop as any).farmName,
        cropid: crop.id
      };
      const card = displayCropCard(cardData);
      if (card) fragment.appendChild(card);
    });

    container.replaceChildren(fragment);
  } catch (err) {
    console.error("Failed to fetch category items:", err);

    container.replaceChildren();
    const errorState = document.createElement("p");
    errorState.className = "category-items__error";
    errorState.textContent = "❌ Failed to load items.";
    container.append(errorState);
  }
}