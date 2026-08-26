import { createElement } from "../../components/createElement.js";
import { ItemType } from "./types.js";

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function renderSearchAndSortUI(
  type: ItemType,
  sort: string,
  search: string,
  onChange: (newSort: string, newSearch: string) => void
): { sortSelect: HTMLSelectElement; searchInput: HTMLInputElement } {
  const sortSelect = createElement(
    "select",
    {
      events: {
        change: (e: Event) => onChange((e.target as HTMLSelectElement).value, search),
      },
    },
    [
      { value: "", label: "Sort by" },
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
      { value: "name_asc", label: "Name: A to Z" },
      { value: "name_desc", label: "Name: Z to A" },
    ].map((opt) =>
      createElement(
        "option",
        { value: opt.value, ...(opt.value === sort ? { selected: true } : {}) },
        [opt.label]
      )
    )
  ) as HTMLSelectElement;

  sortSelect.setAttribute("name", "sortproducts");

  const debouncedSearch = debounce((val: string) => onChange(sort, val), 300);

  const searchInput = createElement("input", {
    type: "text",
    placeholder: `Search ${type}s…`,
    value: search,
    events: {
      input: (e: Event) => debouncedSearch((e.target as HTMLInputElement).value),
    },
  }) as HTMLInputElement;

  searchInput.setAttribute("name", "searchproducts");

  return { sortSelect, searchInput };
}