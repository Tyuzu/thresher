import Notify from "../../../components/ui/Notify.js";
import { hireVendor } from "./hireVendorAction.js";
import { displayBooking } from "../../booking/booking.js";
import { getState } from "../../../state/state.js";
import { formatRequestStatus } from "./vendorUtils.js";
import { createElement } from "../../../components/createElement.js";

export interface VendorActionsProps {
    eventId?: string;
    vendorId: string;
    vendorName: string;
    vendor: Record<string, any>;
    hired: boolean;
    hiringStatus?: string;
    isLoggedIn: boolean;
    onHireSuccess?: (details: { eventId?: string; vendorId: string; vendor: Record<string, any> }) => void | Promise<void>;
}

/**
 * Creates the action button group (Hire & Book) strictly for organizers.
 */
export function renderVendorActions({
    eventId,
    vendorId,
    vendorName,
    vendor,
    hired,
    hiringStatus,
    isLoggedIn,
    onHireSuccess
}: VendorActionsProps): HTMLElement {
    const actionsEl = createElement("div", { class: "vendor-actions" }) as HTMLElement;

    // 1. Render Hire Button if an explicit event context is present
    if (eventId) {
        const hireButton = createElement("button", {
            type: "button",
            class: `hire-btn${hired ? " hired" : ""}`,
            disabled: hired,
            events: {
                click: async () => {
                    if (!isLoggedIn) {
                        Notify("Please log in to hire vendors.", { type: "warning", duration: 3000 });
                        return;
                    }

                    const originalLabel = hireButton.textContent;
                    (hireButton as HTMLButtonElement).disabled = true;
                    hireButton.textContent = "Hiring...";

                    const hiredSuccessfully = await hireVendor(eventId, vendorId, vendorName);

                    if (hiredSuccessfully) {
                        if (typeof onHireSuccess === "function") {
                            await onHireSuccess({ eventId, vendorId, vendor });
                        }
                        return;
                    }

                    if (!hired) {
                        (hireButton as HTMLButtonElement).disabled = false;
                        hireButton.textContent = originalLabel;
                    }
                }
            }
        }, hired ? formatRequestStatus(hiringStatus) : "Hire Vendor") as HTMLElement;

        actionsEl.appendChild(hireButton);
    }

    // 2. Render Calendar Booking Modal Trigger Button
    const bookBtn = createElement("button", {
        type: "button",
        class: "btn-primary book-vendor-btn",
        events: {
            click: async () => {
                if (!getState || !getState("token")) {
                    Notify("Please log in to book vendors.", { type: "warning", duration: 3000 });
                    return;
                }

                const bookingContainer = createElement("div", {
                    style: { display: "none" }
                }) as HTMLElement;
                document.body.appendChild(bookingContainer);

                try {
                    displayBooking({ 
                        entityType: "vendor", 
                        entityId: vendorId, 
                        entityCategory: vendorName, 
                        userId: getState("user")?.userid || "guest" 
                    }, bookingContainer);

                    const action = bookingContainer.querySelector(".btn-primary") as HTMLElement | null;
                    if (action) action.click();
                } catch (err) {
                    console.error("Failed to open booking modal:", err);
                    Notify("Failed to open booking interface.", { type: "error", duration: 3000 });
                } finally {
                    setTimeout(() => bookingContainer.remove(), 1000);
                }
            }
        }
    }, "Book") as HTMLElement;

    actionsEl.appendChild(bookBtn);
    return actionsEl;
}