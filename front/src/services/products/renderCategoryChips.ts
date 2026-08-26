import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { fetchFarmCategories } from "./api.js";
import { ItemType } from "./types.js";

export async function renderCategoryChips(
  container: HTMLElement,
  selectedCategory: string,
  onSelect: (category: string) => void,
  type: ItemType = "product"
): Promise<void> {
  container.replaceChildren();

  let categories: string[] = [];

  try {
    categories = await fetchFarmCategories(type);
  } catch (_) {
    categories = [];
  }

  const chipContainer = createElement("div", { class: "chip-container sub-nav-chips" });

  const allChip = Button({
    title: "All",
    id: "chip-all",
    classes: !selectedCategory ? "chip selected filter-chip active" : "chip filter-chip",
    events: { click: () => onSelect("") },
  });

  const chips: HTMLElement[] = [allChip];

  for (const cat of categories) {
    const chip = Button({
      title: cat,
      id: `chip-${cat}`,
      classes: selectedCategory === cat ? "chip selected filter-chip active" : "chip filter-chip",
      events: { click: () => onSelect(cat) },
    });
    chips.push(chip);
  }

  chipContainer.append(...chips);
  container.append(chipContainer);
}