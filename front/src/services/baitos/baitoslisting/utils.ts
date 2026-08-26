// utils.ts

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface CategoryMap {
    [key: string]: string[];
}

export const categoryMap: CategoryMap = {
    Food: ["Waiter", "Cook", "Delivery", "Cleaning"],
    Health: ["Reception", "Cleaner", "Helper"],
    Retail: ["Cashier", "Stock", "Floor Staff"],
    Hospitality: ["Housekeeping", "Front Desk", "Server"],
    Other: ["Manual Labor", "Seasonal Work", "Event Help"]
};

/**
 * Clears all child nodes from a given DOM element.
 * 
 * @param el - The target HTMLElement to clear.
 */
export function clearElement(el: HTMLElement): void {
    // Alternatively, el.replaceChildren() can be used for modern browsers
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

/**
 * Saves a job ID to local storage if it isn't already saved.
 * 
 * @param id - The unique identifier of the job (string or number).
 */
export function saveJob(id: string | number): void {
    const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]") as (string | number)[];
    if (!saved.includes(id)) {
        saved.push(id);
        localStorage.setItem("savedJobs", JSON.stringify(saved));
    }
}