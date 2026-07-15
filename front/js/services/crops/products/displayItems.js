import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { renderItemForm } from "./createOrEdit.js";
import { renderItemCard } from "./renderItemCard.js";
import { renderCategoryChips } from "./renderCategoryChips.js";
import { capitalize } from "../../profile/profileHelpers.js";
import { renderSearchAndSortUI } from "./renderSearchAndSortUI.js";
import { sortItems } from "./sortItems.js";
import { renderPagination } from "./renderPagination.js";

export async function displayItems(
  type,
  content,
  isLoggedIn,
  { limit = 10, offset = 0, search = "", category = "", sort = "" } = {}
) {
  const container = createElement("div", { class: "protoolspage" }, []);
  content.replaceChildren();
  content.appendChild(container);

  const refresh = () =>
    displayItems(type, content, isLoggedIn, { limit, offset, search, category, sort });

  container.appendChild(createElement("h2", { class: "page-title" }, [`${capitalize(type)}s`]));

  // Setup dedicated sub-container for category chips so they don't replace global container children
  const chipsWrapper = createElement("div", { class: "chips-wrapper" });
  container.appendChild(chipsWrapper);

  const { sortSelect, searchInput } = renderSearchAndSortUI(type, sort, search, (newSort, newSearch) =>
    displayItems(type, content, isLoggedIn, {
      limit,
      offset: 0,
      search: newSearch,
      category,
      sort: newSort,
    })
  );

  await renderCategoryChips(chipsWrapper, category, (newCategory) =>
    displayItems(type, content, isLoggedIn, {
      limit,
      offset: 0,
      search,
      category: newCategory,
      sort,
    }), type
  );

  const topBar = createElement("div", { class: "items-topbar" }, [
    searchInput,
    sortSelect,
    isLoggedIn
      ? Button(
        `Create ${type}`,
        `create-${type}-btn`,
        { click: () => renderItemForm(container, "create", null, type, refresh) },
        "primary-button critical-action"
      )
      : null,
  ].filter(Boolean));

  container.appendChild(topBar);

  let items = [];
  let total = 0;

  try {
    const qs = new URLSearchParams({ type, limit, offset, search, category });
    const result = await apiFetch(`/farm/items?${qs.toString()}`);
    items = result.items || [];
    total = result.total ?? items.length;
  } catch (err) {
    container.appendChild(createElement("p", { class: "error-message" }, [`Failed to load ${type}s.`]));
    return;
  }

  if (items.length === 0) {
    container.appendChild(createElement("p", { class: "no-results" }, [`No ${type}s found.`]));
    return;
  }

  sortItems(items, sort);

  const grid = createElement("div", { class: `${type}-grid items-grid` });
  items.forEach((item) => {
    grid.appendChild(renderItemCard(item, type, isLoggedIn, container, refresh));
  });

  container.appendChild(grid);

  renderPagination(container, total, limit, offset, currentPage =>
    displayItems(type, content, isLoggedIn, {
      limit,
      offset: (currentPage - 1) * limit,
      search,
      category,
      sort,
    })
  );
}