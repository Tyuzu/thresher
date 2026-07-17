import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

function MultiSelect({ options = [], selected = [], placeholder = "", onChange }) {
  // Work with a local copy of state to avoid parent reference contamination
  let localSelected = [...selected];
  let open = false;

  // DOM Composition Assembly
  const wrapper = createElement("div", { class: "multiselect-wrapper" });
  
  // Custom interactive wrapper for structural layout alignment
  const controlBox = createElement("div", { class: "multiselect-control" });
  const chipsContainer = createElement("div", { class: "multiselect-chips" });
  const input = createElement("input", { 
    type: "text", 
    placeholder: localSelected.length === 0 ? placeholder : "",
    class: "multiselect-input"
  });
  
  controlBox.append(chipsContainer, input);

  const dropdown = createElement("div", { 
    class: "multiselect-dropdown",
    style: "display: none;" 
  });

  // ---------------------------
  // DROPDOWN OPERATIONS
  // ---------------------------
  const openDropdown = () => {
    dropdown.style.display = "block";
    open = true;
    refreshDropdown();
  };

  const closeDropdown = () => {
    dropdown.style.display = "none";
    open = false;
    input.value = "";
  };

  // Safe Document-wide reference click toggle
  const handleOutsideClick = (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown();
    }
  };

  document.addEventListener("click", handleOutsideClick);
  input.addEventListener("focus", openDropdown);

  // ---------------------------
  // RENDER DROPDOWN OPTIONS
  // ---------------------------
  const refreshDropdown = () => {
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

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        localSelected = [...localSelected, opt];
        
        onChange?.(localSelected);
        refreshChips();
        input.value = "";
        input.focus(); // Keep focus for fast sequential entry
        refreshDropdown();
      });

      dropdown.append(item);
    });
  };

  // ---------------------------
  // RENDER SELECTED SELECTIONS
  // ---------------------------
  const refreshChips = () => {
    chipsContainer.replaceChildren();
    
    // Manage input placeholder visibility depending on chosen tag volumes
    input.placeholder = localSelected.length === 0 ? placeholder : "";

    localSelected.forEach((val) => {
      const chip = createElement("div", { class: "chip" }, [
        createElement("span", { class: "chip-label" }, [val]),
        Button("×", "", {
          click: (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Non-destructive removal loop processing
            localSelected = localSelected.filter(item => item !== val);
            
            onChange?.(localSelected);
            refreshChips();
            refreshDropdown();
          }
        }, "chip-remove-btn")
      ]);

      chipsContainer.append(chip);
    });
  };

  // ---------------------------
  // KEYBOARD UTILITIES & ENTRY TRACKS
  // ---------------------------
  input.addEventListener("input", refreshDropdown);

  input.addEventListener("keydown", (e) => {
    // Enable backspace clearing tracking if input buffer is empty
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

  // Structural Append Ordering: Control Container sits directly above the dropdown options
  wrapper.append(controlBox, dropdown);

  // Initialize view layers
  refreshChips();

  // Return DOM tree root paired alongside explicit destructor routine
  return {
    element: wrapper,
    destroy: () => {
      document.removeEventListener("click", handleOutsideClick);
    }
  };
}

export default MultiSelect;