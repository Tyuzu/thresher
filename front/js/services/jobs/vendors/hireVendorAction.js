import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";

function normalizeErrorMessage(error) {
    if (!error) {
        return "";
    }

    if (typeof error === "string") {
        return error;
    }

    return error.message || error.error || "";
}

function dispatchVendorEvent(eventName, detail) {
    if (typeof document !== "undefined" && typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}

/**
 * Handle vendor hiring action
 * Sends a POST request to hire a vendor for an event
 */
export async function hireVendor(eventId, vendorId, vendorName) {
    if (!eventId || !vendorId) {
        Notify("Event ID and Vendor ID are required to hire vendors.", {
            type: "error",
            duration: 3000
        });
        return false;
    }

    try {
        const result = await apiFetch(
            `/vendors/events/${eventId}/hire`,
            "POST",
            { vendorid: vendorId }
        );

        if (result?.success === false) {
            const message = normalizeErrorMessage(result).toLowerCase();

            if (message.includes("already hired")) {
                Notify(`${vendorName || "This vendor"} is already hired for this event.`, {
                    type: "info",
                    duration: 3000
                });
                return false;
            }

            throw new Error(result.error || "Failed to hire vendor.");
        }

        if (result?.error === "ALREADY_HIRED") {
            Notify(`${vendorName || "This vendor"} is already hired for this event.`, {
                type: "info",
                duration: 3000
            });
            return false;
        }

        Notify(`Successfully hired ${vendorName || "vendor"} for your event!`, {
            type: "success",
            duration: 3000
        });

        dispatchVendorEvent("vendor-hired", {
            eventId,
            vendorId,
            vendorName,
            result
        });

        return true;
    } catch (error) {
        console.error("Error hiring vendor:", error);

        const message = normalizeErrorMessage(error).toLowerCase();

        if (message.includes("already hired")) {
            Notify(`${vendorName || "This vendor"} is already hired for this event.`, {
                type: "info",
                duration: 3000
            });
        } else if (message.includes("not found")) {
            Notify("Vendor not found. Please refresh and try again.", {
                type: "error",
                duration: 3000
            });
        } else {
            Notify("Failed to hire vendor. Please try again.", {
                type: "error",
                duration: 3000
            });
        }

        return false;
    }
}

/**
 * Remove a vendor from an event
 */
export async function removeVendor(eventId, vendorId, vendorName) {
    if (!eventId || !vendorId) {
        Notify("Invalid event or vendor ID.", {
            type: "error",
            duration: 3000
        });
        return false;
    }

    try {
        const result = await apiFetch(
            `/vendors/events/${eventId}/vendor/${vendorId}`,
            "DELETE"
        );

        if (result?.success === false) {
            throw new Error(result.error || "Failed to remove vendor.");
        }

        Notify(`${vendorName || "Vendor"} has been removed from your event.`, {
            type: "success",
            duration: 3000
        });

        dispatchVendorEvent("vendor-removed", {
            eventId,
            vendorId,
            vendorName,
            result
        });

        return true;
    } catch (error) {
        console.error("Error removing vendor:", error);
        Notify("Failed to remove vendor. Please try again.", {
            type: "error",
            duration: 3000
        });
        return false;
    }
}