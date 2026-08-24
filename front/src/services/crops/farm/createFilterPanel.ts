import { createElement } from "../../../components/createElement.js";

export interface FilterState {
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  region?: string;
  lat?: number | null;
  lng?: number | null;
}

export type FilterChangeCallback = () => void;

/**
 * Creates a generic debounce wrapper to avoid triggering rapid API calls on keystrokes.
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Creates an interactive filter panel control.
 *
 * @param filters - Initial filter state object.
 * @param onChange - Callback function triggered when filter values change.
 * @returns The complete filter panel DOM element.
 */
export function createFilterPanel(
  filters: FilterState = {},
  onChange: FilterChangeCallback = () => {}
): HTMLElement {
  const debouncedOnChange = debounce(onChange, 300);

  // Initialize inputs with current filter values
  const minPrice = createElement("input", {
    type: "number",
    placeholder: "Min Price",
    value: filters.minPrice ?? "",
    min: "0"
  }) as HTMLInputElement;

  const maxPrice = createElement("input", {
    type: "number",
    placeholder: "Max Price",
    value: filters.maxPrice ?? "",
    min: "0"
  }) as HTMLInputElement;

  const stockCheckbox = createElement("input", {
    type: "checkbox",
    checked: Boolean(filters.inStock)
  }) as HTMLInputElement;

  const regionInput = createElement("input", {
    type: "text",
    placeholder: "Region (optional)",
    value: filters.region ?? ""
  }) as HTMLInputElement;

  const geoBtn = createElement("button", {
    type: "button",
    class: "filter-panel__geo-btn"
  }, ["📍 Near Me"]) as HTMLButtonElement;

  // Handler for text and number inputs (Debounced)
  const handleInput = (): void => {
    filters.minPrice = minPrice.value;
    filters.maxPrice = maxPrice.value;
    filters.region = regionInput.value.trim();
    debouncedOnChange();
  };

  // Handler for checkbox toggle (Immediate)
  const handleToggle = (): void => {
    filters.inStock = stockCheckbox.checked;
    onChange();
  };

  minPrice.addEventListener("input", handleInput);
  maxPrice.addEventListener("input", handleInput);
  regionInput.addEventListener("input", handleInput);
  stockCheckbox.addEventListener("change", handleToggle);

  // Geolocation handling with UI state feedback
  geoBtn.addEventListener("click", (): void => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    const originalText = geoBtn.textContent ?? "📍 Near Me";
    geoBtn.disabled = true;
    geoBtn.textContent = "⏳ Locating...";

    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition): void => {
        filters.lat = pos.coords.latitude;
        filters.lng = pos.coords.longitude;
        geoBtn.textContent = "✅ Located";
        geoBtn.disabled = false;
        onChange();
      },
      (err: GeolocationPositionError): void => {
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
  ]) as HTMLElement;
}