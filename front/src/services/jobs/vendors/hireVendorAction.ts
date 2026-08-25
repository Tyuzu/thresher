import Notify from "../../../components/ui/Notify.js";
import { hireEventVendor, removeEventVendor } from "./vendorService.js";
import { dispatchVendorEvent, VENDOR_EVENTS } from "./vendorEvents.js";
import { normalizeErrorMessage } from "./vendorUtils.js";

function isAlreadyHiredMessage(message: unknown): boolean {
    const lower = String(message || "").toLowerCase();
    return lower.includes("already hired") || lower.includes("already exists") || lower.includes("duplicate");
}

function isNotFoundMessage(message: unknown): boolean {
    const lower = String(message || "").toLowerCase();
    return lower.includes("not found") || lower.includes("missing");
}

export async function hireVendor(eventId: string, vendorId: string, vendorName?: string): Promise<boolean> {
    if (!eventId || !vendorId) {
        Notify("Event ID and Vendor ID are required to hire vendors.", {
            type: "error",
            duration: 3000
        });
        return false;
    }

    try {
        const result: any = await hireEventVendor(eventId, vendorId);

        if (result?.success === false) {
            const message = normalizeErrorMessage(result);
            const code = String(result?.error || result?.code || "").toUpperCase();

            if (code === "ALREADY_HIRED" || isAlreadyHiredMessage(message)) {
                Notify(`${vendorName || "This vendor"} is already hired for this event.`, {
                    type: "info",
                    duration: 3000
                });
                return false;
            }

            throw new Error(message || "Failed to hire vendor.");
        }

        if (String(result?.error || result?.code || "").toUpperCase() === "ALREADY_HIRED") {
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

        dispatchVendorEvent(VENDOR_EVENTS.HIRED, {
            eventId,
            vendorId,
            vendorName,
            result
        });

        return true;
    } catch (error: unknown) {
        console.error("Error hiring vendor:", error);

        const message = normalizeErrorMessage(error);

        if (isAlreadyHiredMessage(message)) {
            Notify(`${vendorName || "This vendor"} is already hired for this event.`, {
                type: "info",
                duration: 3000
            });
        } else if (isNotFoundMessage(message)) {
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

export async function removeVendor(eventId: string, vendorId: string, vendorName?: string): Promise<boolean> {
    if (!eventId || !vendorId) {
        Notify("Invalid event or vendor ID.", {
            type: "error",
            duration: 3000
        });
        return false;
    }

    try {
        const result: any = await removeEventVendor(eventId, vendorId);

        if (result?.success === false) {
            throw new Error(normalizeErrorMessage(result) || "Failed to remove vendor.");
        }

        Notify(`${vendorName || "Vendor"} has been removed from your event.`, {
            type: "success",
            duration: 3000
        });

        dispatchVendorEvent(VENDOR_EVENTS.REMOVED, {
            eventId,
            vendorId,
            vendorName,
            result
        });

        return true;
    } catch (error: unknown) {
        console.error("Error removing vendor:", error);
        Notify("Failed to remove vendor. Please try again.", {
            type: "error",
            duration: 3000
        });
        return false;
    }
}