import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

export interface MultiSelectProps {
  options?: string[];
  selected?: string[];
  placeholder?: string;
  onChange?: (selected: string[]) => void;
}

export interface MultiSelectResult {
  element: HTMLDivElement;
  destroy: () => void;
}

function MultiSelect({
  options = [],
  selected = [],
  placeholder = "",
  onChange,
}: MultiSelectProps): MultiSelectResult {
  // Local state copy
  let localSelected: string[] = [...selected];
  let open: boolean = false;

  // DOM Composition Assembly
  const wrapper = createElement("div", { class: "multiselect-wrapper" }) as HTMLDivElement;
  
  const controlBox = createElement("div", { class: "multiselect-control" });
  const chipsContainer = createElement("div", { class: "multiselect-chips" });
  const input = createElement("input", { 
    type: "text", 
    placeholder: localSelected.length === 0 ? placeholder : "",
    class: "multiselect-input"
  }) as HTMLInputElement;
  
  controlBox.append(chipsContainer, input);

  const dropdown = createElement("div", { 
    class: "multiselect-dropdown",
    style: "display: none;" 
  }) as HTMLDivElement;

  // ---------------------------
  // DROPDOWN OPERATIONS
  // ---------------------------
  const openDropdown = (): void => {
    dropdown.style.display = "block";
    open = true;
    refreshDropdown();
  };

  const closeDropdown = (): void => {
    dropdown.style.display = "none";
    open = false;
    input.value = "";
  };

  const handleOutsideClick = (e: MouseEvent): void => {
    if (!wrapper.contains(e.target as Node)) {
      closeDropdown();
    }
  };

  document.addEventListener("click", handleOutsideClick);
  input.addEventListener("focus", openDropdown);

  // ---------------------------
  // RENDER DROPDOWN OPTIONS
  // ---------------------------
  const refreshDropdown = (): void => {
    dropdown.replaceChildren();

    if (!open) return;

    const query = input.value.trim().toLowerCase();
    const filtered = options.filter(opt =>
      opt.toLowerCase().includes(query) && !localSelected.includes(opt)
    );

    if (filtered.length === 0) {
      const none = createElement("div", { class: "multiselect-item item-no-matches" }, ["No matches found"]);
      dropdown.append(none);
      return;
    }

    filtered.forEach(opt => {
      const item = createElement("div", { 
        class: "multiselect-item",
        role: "option"
      }, [opt]);

      item.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        localSelected = [...localSelected, opt];
        
        onChange?.(localSelected);
        refreshChips();
        input.value = "";
        input.focus();
        refreshDropdown();
      });

      dropdown.append(item);
    });
  };

  // ---------------------------
  // RENDER SELECTED SELECTIONS
  // ---------------------------
  const refreshChips = (): void => {
    chipsContainer.replaceChildren();
    
    input.placeholder = localSelected.length === 0 ? placeholder : "";

    localSelected.forEach((val) => {
      const chip = createElement("div", { class: "chip" }, [
        createElement("span", { class: "chip-label" }, [val]),
        Button({
          title: "×",
          classes: "chip-remove-btn",
          events: {
            click: (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              
              localSelected = localSelected.filter(item => item !== val);
              
              onChange?.(localSelected);
              refreshChips();
              refreshDropdown();
            }
          }
        })
      ]);

      chipsContainer.append(chip);
    });
  };

  // ---------------------------
  // KEYBOARD UTILITIES
  // ---------------------------
  input.addEventListener("input", refreshDropdown);

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Backspace" && input.value === "" && localSelected.length > 0) {
      localSelected.pop();
      onChange?.(localSelected);
      refreshChips();
      refreshDropdown();
    } else if (e.key === "Escape") {
      closeDropdown();
      input.blur();
    }
  });

  wrapper.append(controlBox, dropdown);

  refreshChips();

  return {
    element: wrapper,
    destroy: () => {
      document.removeEventListener("click", handleOutsideClick);
    }
  };
}

export default MultiSelect;