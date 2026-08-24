import { createElement } from "../../../components/createElement.js";

/**
 * Creates a simple debounce wrapper to avoid triggering rapid API calls on keystrokes.
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Creates an interactive filter panel control.
 *
 * @param {Object} filters - Initial filter state object.
 * @param {Function} onChange - Callback function triggered when filter values change.
 * @returns {HTMLElement} The complete filter panel element.
 */
export function createFilterPanel(filters = {}, onChange = () => {}) {
  const debouncedOnChange = debounce(onChange, 300);

  // Initialize inputs with current filter values
  const minPrice = createElement("input", {
    type: "number",
    placeholder: "Min Price",
    value: filters.minPrice ?? "",
    min: "0"
  });

  const maxPrice = createElement("input", {
    type: "number",
    placeholder: "Max Price",
    value: filters.maxPrice ?? "",
    min: "0"
  });

  const stockCheckbox = createElement("input", {
    type: "checkbox",
    checked: Boolean(filters.inStock)
  });

  const regionInput = createElement("input", {
    type: "text",
    placeholder: "Region (optional)",
    value: filters.region ?? ""
  });

  const geoBtn = createElement("button", {
    type: "button",
    class: "filter-panel__geo-btn"
  }, ["📍 Near Me"]);

  // Handler for text and number inputs (Debounced)
  const handleInput = () => {
    filters.minPrice = minPrice.value;
    filters.maxPrice = maxPrice.value;
    filters.region = regionInput.value.trim();
    debouncedOnChange();
  };

  // Handler for checkbox toggle (Immediate)
  const handleToggle = () => {
    filters.inStock = stockCheckbox.checked;
    onChange();
  };

  minPrice.addEventListener("input", handleInput);
  maxPrice.addEventListener("input", handleInput);
  regionInput.addEventListener("input", handleInput);
  stockCheckbox.addEventListener("change", handleToggle);

  // Geolocation handling with UI state feedback
  geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    const originalText = geoBtn.textContent;
    geoBtn.disabled = true;
    geoBtn.textContent = "⏳ Locating...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        filters.lat = pos.coords.latitude;
        filters.lng = pos.coords.longitude;
        geoBtn.textContent = "✅ Located";
        geoBtn.disabled = false;
        onChange();
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Could not retrieve location.");
        geoBtn.textContent = originalText;
        geoBtn.disabled = false;
      },
      { timeout: 10000 }
    );
  });

  return createElement("div", { class: "filter-panel" }, [
    createElement("label", { class: "filter-panel__field" }, ["Min ₹", minPrice]),
    createElement("label", { class: "filter-panel__field" }, ["Max ₹", maxPrice]),
    createElement("label", { class: "filter-panel__field" }, [stockCheckbox, "In Stock Only"]),
    createElement("label", { class: "filter-panel__field" }, ["Region", regionInput]),
    geoBtn
  ]);
}