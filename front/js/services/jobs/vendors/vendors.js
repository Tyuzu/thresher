import Notify from "../../../components/ui/Notify.mjs";
import { loadVendors } from "./loadVendors.js";
import { vendorForm } from "./vendorForm.js";
import { createElement } from "../../../components/createElement.js";

/**
 * Builds the marketplace top header section.
 */
function buildHeader(eventId) {
    return createElement("div", { class: "vendors-header" }, [
        createElement("h2", { class: "vendors-title" }, "Vendors Marketplace"),
        createElement("p", { class: "vendors-subtitle" }, eventId
            ? "Hire vendors for your event"
            : "Browse vendors and register your own profile")
    ]);
}

/**
 * Handles form toggle visibility state, focusing first input safely.
 */
function setupToggleInterface(section, button, formElement) {
    formElement.classList.add("hidden");
    section.appendChild(formElement);

    button.addEventListener("click", () => {
        const isCurrentlyHidden = formElement.classList.toggle("hidden");
        button.textContent = isCurrentlyHidden
            ? "List Yourself as Vendor"
            : "Hide Registration";

        if (!isCurrentlyHidden) {
            const firstField = formElement.querySelector("input, select, textarea");
            if (firstField && typeof firstField.focus === "function") {
                firstField.focus();
            }
        }
    });
}

/**
 * Orchestrates and renders the core vendors UI view panel.
 */
export async function hireVendors(anacon, isCreator, isLoggedIn, eventId, options = {}) {
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

    const renderUI = async () => {
        anacon.innerHTML = "";

        const wrapper = createElement("div", {
            id: "vendors-wrapper",
            class: "vendors-container"
        }, [
            buildHeader(eventId)
        ]);

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
            }, "List Yourself as Vendor");

            const registrationSection = createElement("div", {
                class: "vendor-registration-section"
            }, [
                createElement("h3", { class: "registration-title" }, "Want to Become a Vendor?"),
                toggleBtn
            ]);

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