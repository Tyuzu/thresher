export const VENDOR_EVENTS = Object.freeze({
    HIRED: "vendor-hired",
    REMOVED: "vendor-removed",
    REGISTERED: "vendor-registered",
    UPDATED: "vendor-updated",
    DELETED: "vendor-deleted"
});

export function dispatchVendorEvent(eventName: string, detail: Record<string, any> = {}): void {
    if (typeof document !== "undefined" && typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}