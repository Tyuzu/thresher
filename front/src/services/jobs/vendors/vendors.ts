import Notify from "../../../components/ui/Notify.js";
import { loadVendors } from "./loadVendors.js";
import { vendorForm } from "./vendorForm.js";
import { createElement } from "../../../components/createElement.js";

interface HireVendorsOptions {
    onChange?: () => Promise<void> | void;
    [key: string]: any;
}

/**
 * Builds the marketplace top header section.
 */
function buildHeader(eventId?: string): HTMLElement {
    return createElement("div", { class: "vendors-header" }, [
        createElement("h2", { class: "vendors-title" }, "Vendors Marketplace"),
        createElement("p", { class: "vendors-subtitle" }, eventId
            ? "Hire vendors for your event"
            : "Browse vendors and register your own profile")
    ]) as HTMLElement;
}

/**
 * Handles form toggle visibility state, focusing first input safely.
 */
function setupToggleInterface(section: HTMLElement, button: HTMLElement, formElement: HTMLElement): void {
    formElement.classList.add("hidden");
    section.appendChild(formElement);

    button.addEventListener("click", () => {
        const isCurrentlyHidden = formElement.classList.toggle("hidden");
        button.textContent = isCurrentlyHidden
            ? "List Yourself as Vendor"
            : "Hide Registration";

        if (!isCurrentlyHidden) {
            const firstField = formElement.querySelector("input, select, textarea") as HTMLElement | null;
            if (firstField && typeof firstField.focus === "function") {
                firstField.focus();
            }
        }
    });
}

/**
 * Orchestrates and renders the core vendors UI view panel.
 */
export async function hireVendors(
    anacon: HTMLElement,
    isCreator: boolean,
    isLoggedIn: boolean,
    eventId?: string,
    options: HireVendorsOptions = {}
): Promise<HTMLElement | null> {
    if (!anacon) {
        console.error("Vendor container element is required.");
        return null;
    }

    if (!isLoggedIn) {
        Notify("Please log in first.", {
            type: "warning",
            duration: 3000,
            dismissible: true
        });
        return null;
    }

    const onActionTriggered = async () => {
        if (typeof options.onChange === "function") {
            await options.onChange();
        }
        await renderUI();
    };

    const renderUI = async (): Promise<HTMLElement> => {
        anacon.innerHTML = "";

        const wrapper = createElement("div", {
            id: "vendors-wrapper",
            class: "vendors-container"
        }, [
            buildHeader(eventId)
        ]) as HTMLElement;

        // Load Vendor List (isCreator determines if action buttons are visible)
        const vendorListEl = await loadVendors(eventId, isLoggedIn, {
            isCreator,
            onHireSuccess: onActionTriggered
        });
        wrapper.appendChild(vendorListEl);

        // Only non-creators can register themselves as vendors.
        if (!isCreator) {
            const toggleBtn = createElement("button", {
                type: "button",
                class: "btn-secondary vendor-list-btn"
            }, "List Yourself as Vendor") as HTMLElement;

            const registrationSection = createElement("div", {
                class: "vendor-registration-section"
            }, [
                createElement("h3", { class: "registration-title" }, "Want to Become a Vendor?"),
                toggleBtn
            ]) as HTMLElement;

            const formElement = vendorForm(
                anacon,
                isLoggedIn,
                eventId,
                onActionTriggered,
                { mode: "create" }
            );

            setupToggleInterface(registrationSection, toggleBtn, formElement);
            wrapper.appendChild(registrationSection);
        } else {
            console.log("Event creator detected: registration form hidden.");
        }

        anacon.appendChild(wrapper);
        return wrapper;
    };

    return renderUI();
}