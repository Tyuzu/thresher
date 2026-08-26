// buildFilterBar.ts

import { categoryMap } from "./utils";
import Button from "../../../components/base/Button";
import { createElement } from "../../../components/createElement";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface FilterValues {
    category: string;
    subcategory: string;
    locations: string[];
    keyword: string;
    minWage: number;
    sort: string;
}

export interface FilterBarResult {
    filterBar: HTMLElement;
    getValues: () => FilterValues;
    resetPage: () => void;
    clearFilters: () => void;
}

/**
 * buildFilterBar(onFilterChange, onClear)
 * - onFilterChange: called when any filter input changes
 * - onClear: optional callback called specifically when user clicks the clear button
 */
export function buildFilterBar(
    onFilterChange?: () => void, 
    onClear: (() => void) | null = null
): FilterBarResult {
    const categorySelect = createElement("select", {}) as HTMLSelectElement;
    const subcategorySelect = createElement("select", {}) as HTMLSelectElement;
    const locationInput = createElement("input", { type: "text", placeholder: "📍 Location (comma separated)" }) as HTMLInputElement;
    const keywordInput = createElement("input", { type: "text", placeholder: "🔍 Keywords" }) as HTMLInputElement;
    const wageInput = createElement("input", { type: "number", placeholder: "Min Wage (¥)", min: "0" }) as HTMLInputElement;
    const sortSelect = createElement("select", {}) as HTMLSelectElement;

    // populate category options
    categorySelect.append(
        createElement("option", { value: "" }, ["All Categories"]),
        ...Object.keys(categoryMap).map(cat => createElement("option", { value: cat }, [cat]))
    );

    subcategorySelect.append(createElement("option", { value: "" }, ["All Roles"]));

    sortSelect.append(
        createElement("option", { value: "date" }, ["Sort: Newest"]),
        createElement("option", { value: "wage" }, ["Sort: Wage (high → low)"])
    );

    categorySelect.addEventListener("change", () => {
        while (subcategorySelect.firstChild) {
            subcategorySelect.removeChild(subcategorySelect.firstChild);
        }
        subcategorySelect.append(
            createElement("option", { value: "" }, ["All Roles"]),
            ...(categoryMap[categorySelect.value] || []).map(sub => createElement("option", { value: sub }, [sub]))
        );
        if (typeof onFilterChange === "function") {
            onFilterChange();
        }
    });

    // listen to inputs
    [keywordInput, subcategorySelect, locationInput, wageInput, sortSelect].forEach(el =>
        el.addEventListener("input", () => {
            if (typeof onFilterChange === "function") {
                onFilterChange();
            }
        })
    );

    // Updated Button component call matching the ButtonOptions interface
    const clearBtn = Button({
        title: "Clear Filters",
        id: "clear-filters",
        classes: "btn btn-secondary",
        events: {
            click: () => {
                categorySelect.value = "";
                while (subcategorySelect.firstChild) {
                    subcategorySelect.removeChild(subcategorySelect.firstChild);
                }
                subcategorySelect.append(createElement("option", { value: "" }, ["All Roles"]));
                locationInput.value = "";
                keywordInput.value = "";
                wageInput.value = "";
                sortSelect.value = "date";

                // call page-level clear handler if provided
                if (typeof onClear === "function") {
                    onClear();
                }

                // also trigger standard filter change so UI updates
                if (typeof onFilterChange === "function") {
                    onFilterChange();
                }
            }
        }
    }) as HTMLButtonElement;

    const filterBar = createElement("div", { class: "baito-filter-bar" }, [
        categorySelect, subcategorySelect, locationInput, keywordInput, wageInput, sortSelect, clearBtn
    ]) as HTMLElement;

    return {
        filterBar,
        getValues: () => ({
            category: categorySelect.value,
            subcategory: subcategorySelect.value,
            locations: locationInput.value.toLowerCase().split(",").map(s => s.trim()).filter(Boolean),
            keyword: keywordInput.value.toLowerCase(),
            minWage: parseInt(wageInput.value || "0", 10),
            sort: sortSelect.value
        }),
        resetPage: () => {
            if (typeof onFilterChange === "function") {
                onFilterChange();
            }
        },
        clearFilters: () => {
            clearBtn.click();
        }
    };
}