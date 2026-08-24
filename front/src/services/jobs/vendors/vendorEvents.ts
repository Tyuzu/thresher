export const VENDOR_EVENTS = Object.freeze({
    HIRED: "vendor-hired",
    REMOVED: "vendor-removed",
    REGISTERED: "vendor-registered",
    UPDATED: "vendor-updated",
    DELETED: "vendor-deleted"
});

export function dispatchVendorEvent(eventName, detail = {}) {
    if (typeof document !== "undefined" && typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}