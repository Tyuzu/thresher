import { apiFetch } from "../../../api/api.js";
import { displayCropCard } from "../crop/displayCropCard.js";

/**
 * Renders items for a specific category into a container element with filtering support.
 *
 * @param {HTMLElement} container - DOM node where items should be rendered.
 * @param {string} category - Category identifier or name.
 * @param {Object} [filters={}] - Optional filters for querying items.
 * @returns {Promise<void>}
 */
export async function renderCategoryItems(container, category, filters = {}) {
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
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
    if (filters.inStock) params.append("inStock", "true");
    if (filters.region) params.append("region", filters.region);
    if (filters.lat) params.append("lat", filters.lat);
    if (filters.lng) params.append("lng", filters.lng);

    const queryString = params.toString();
    const endpoint = `/crops${queryString ? `?${queryString}` : ""}`;

    const res = await apiFetch(endpoint);

    if (!res?.success || !Array.isArray(res?.crops) || res.crops.length === 0) {
      container.replaceChildren();
      const emptyState = document.createElement("p");
      emptyState.className = "category-items__empty";
      emptyState.textContent = "No items found in this category.";
      container.append(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();

    res.crops.forEach(crop => {
      const card = displayCropCard(crop);
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