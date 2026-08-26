import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { fetchFarmItems } from "./api.js";
import { renderItemForm } from "./createOrEdit.js";
import { renderItemCard } from "./renderItemCard.js";
import { renderCategoryChips } from "./renderCategoryChips.js";
import { capitalize } from "../profile/profileHelpers.js";
import { renderSearchAndSortUI } from "./renderSearchAndSortUI.js";
import { renderPagination } from "./renderPagination.js";
import { DisplayItemsOptions, FarmItem, ItemType } from "./types.js";

export function sortItems(items: FarmItem[], sort: string): void {
  switch (sort) {
    case "price_asc":
      items.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      items.sort((a, b) => b.price - a.price);
      break;
    case "name_asc":
      items.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name_desc":
      items.sort((a, b) => b.name.localeCompare(a.name));
      break;
  }
}

export async function displayItems(
  type: ItemType,
  content: HTMLElement,
  isLoggedIn: boolean,
  { limit = 10, offset = 0, search = "", category = "", sort = "" }: DisplayItemsOptions = {}
): Promise<void> {
  const container = createElement("div", { class: "protoolspage" }, []);
  content.replaceChildren();
  content.appendChild(container);

  const refresh = () =>
    displayItems(type, content, isLoggedIn, { limit, offset, search, category, sort });

  container.appendChild(createElement("h2", { class: "page-title" }, [`${capitalize(type)}s`]));

  // Setup dedicated sub-container for category chips
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

  await renderCategoryChips(
    chipsWrapper,
    category,
    (newCategory) =>
      displayItems(type, content, isLoggedIn, {
        limit,
        offset: 0,
        search,
        category: newCategory,
        sort,
      }),
    type
  );

  const topBar = createElement("div", { class: "items-topbar" }, [
    searchInput,
    sortSelect,
    isLoggedIn
      ? Button({
          title: `Create ${type}`,
          id: `create-${type}-btn`,
          classes: "primary-button critical-action",
          events: {
            click: () => renderItemForm(container, "create", null, type, refresh),
          },
        })
      : null,
  ].filter(Boolean) as HTMLElement[]);

  container.appendChild(topBar);

  let items: FarmItem[] = [];
  let total = 0;

  try {
    const result = await fetchFarmItems(type, { limit, offset, search, category });
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

  renderPagination(container, total, limit, offset, (currentPage) =>
    displayItems(type, content, isLoggedIn, {
      limit,
      offset: (currentPage - 1) * limit,
      search,
      category,
      sort,
    })
  );
}