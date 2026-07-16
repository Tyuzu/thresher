import Notify from "../../../components/ui/Notify.mjs";
import { createVendor, updateVendor } from "./vendorService.js";
import { dispatchVendorEvent, VENDOR_EVENTS } from "./vendorEvents.js";
import { isValidEmail, normalizeErrorMessage } from "./vendorUtils.js";
import { createElement } from "../../../components/createElement.js";

export function vendorForm(anacon, isLoggedIn, eventId, onSuccess = null, options = {}) {
    const mode = options.mode === "edit" ? "edit" : "create";
    const initialData = options.initialData || {};
    const vendorId = options.vendorId ?? initialData.vendorid ?? initialData.vendor_id ?? initialData.vendorId ?? initialData.id ?? null;

    const form = createElement("form", {
        class: mode === "edit" ? "vendor-registration-form vendor-edit-form" : "vendor-registration-form",
        noValidate: "true",
        events: {
            submit: async (event) => {
                event.preventDefault();
                await handleVendorSubmit(form, {
                    isLoggedIn,
                    eventId,
                    onSuccess,
                    mode,
                    vendorId
                });
            }
        }
    });

    const title = createElement("h4", {}, mode === "edit" ? "Edit Vendor Profile" : "List Yourself as a Vendor");
    form.appendChild(title);

    const nameInput = createInput({
        type: "text",
        placeholder: "Your Full Name",
        name: "name",
        required: "true",
        class: "form-input",
        value: initialData.name ?? initialData.full_name ?? ""
    });

    const categorySelect = createElement("select", {
        name: "category",
        required: "true",
        class: "form-input"
    });

    const placeholderOption = createElement("option", {
        value: "",
        disabled: "true"
    }, "Select a Category");
    
    if (!initialData.category) {
        placeholderOption.selected = true;
    }
    categorySelect.appendChild(placeholderOption);

    const categories = [
        ["Catering", "Catering & Food Services"],
        ["Entertainment", "Entertainment & Music"],
        ["Photography", "Photography & Videography"],
        ["Decoration", "Decoration & Setup"],
        ["Transportation", "Transportation"],
        ["Rentals", "Equipment Rentals"],
        ["Staffing", "Staff & Personnel"],
        ["Other", "Other"]
    ];

    for (const [value, label] of categories) {
        const option = createElement("option", { value }, label);
        categorySelect.appendChild(option);
    }

    if (initialData.category) {
        categorySelect.value = initialData.category;
    }

    const descriptionInput = createTextarea({
        name: "description",
        placeholder: "Brief description of your services (optional)",
        class: "form-input",
        rows: "3",
        value: initialData.description ?? ""
    });

    const emailInput = createInput({
        type: "email",
        placeholder: "Contact Email (optional)",
        name: "email",
        class: "form-input",
        value: initialData.email ?? ""
    });

    const phoneInput = createInput({
        type: "tel",
        placeholder: "Contact Phone (optional)",
        name: "phone",
        class: "form-input",
        value: initialData.phone ?? ""
    });

    const locationInput = createInput({
        type: "text",
        placeholder: "Location/Service Area (optional)",
        name: "location",
        class: "form-input",
        value: initialData.location ?? ""
    });

    const submitButton = createElement("button", {
        type: "submit",
        id: `vendor-submit-${Math.random().toString(36).slice(2, 10)}`,
        class: "btn-primary"
    }, mode === "edit" ? "Save Changes" : "Register as Vendor");

    form.appendChild(nameInput);
    form.appendChild(categorySelect);
    form.appendChild(descriptionInput);
    form.appendChild(emailInput);
    form.appendChild(phoneInput);
    form.appendChild(locationInput);
    form.appendChild(submitButton);

    return form;
}

async function handleVendorSubmit(formEl, { isLoggedIn, eventId, onSuccess, mode, vendorId }) {
    if (!isLoggedIn) {
        Notify("Please log in first.", {
            type: "warning",
            duration: 3000,
            dismissible: true
        });
        return;
    }

    const nameInput = formEl.querySelector("input[name='name']");
    const categoryInput = formEl.querySelector("select[name='category']");
    const descriptionInput = formEl.querySelector("textarea[name='description']");
    const emailInput = formEl.querySelector("input[name='email']");
    const phoneInput = formEl.querySelector("input[name='phone']");
    const locationInput = formEl.querySelector("input[name='location']");
    const submitBtn = formEl.querySelector("button[type='submit']");

    const name = nameInput ? nameInput.value.trim() : "";
    const category = categoryInput ? categoryInput.value.trim() : "";
    const description = descriptionInput ? descriptionInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const location = locationInput ? locationInput.value.trim() : "";

    if (!name || !category) {
        Notify("Please fill in required fields (Name and Category).", {
            type: "warning",
            duration: 3000
        });
        return;
    }

    if (email && !isValidEmail(email)) {
        Notify("Please enter a valid email address.", {
            type: "warning",
            duration: 3000
        });
        return;
    }

    if (mode === "edit" && !vendorId) {
        Notify("Vendor ID is required to update this profile.", {
            type: "error",
            duration: 3000
        });
        return;
    }

    const previousLabel = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = mode === "edit" ? "Saving..." : "Registering...";
    }

    try {
        const payload = {
            name,
            category,
            ...(description && { description }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(location && { location })
        };

        const response = mode === "edit"
            ? await updateVendor(vendorId, payload)
            : await createVendor(payload);

        if (response?.success === false) {
            throw new Error(normalizeErrorMessage(response) || (mode === "edit" ? "Failed to update vendor." : "Failed to register vendor."));
        }

        Notify(
            mode === "edit" ? "Vendor profile updated successfully!" : "Vendor registered successfully!",
            {
                type: "success",
                duration: 3000
            }
        );

        const detail = {
            eventId,
            vendorId: vendorId ?? response?.vendorid ?? response?.vendor_id ?? response?.id ?? response?.data?.vendorid ?? null,
            response,
            payload,
            mode
        };

        if (mode === "edit") {
            dispatchVendorEvent(VENDOR_EVENTS.UPDATED, detail);
        } else {
            dispatchVendorEvent(VENDOR_EVENTS.REGISTERED, detail);
        }

        if (typeof onSuccess === "function") {
            await onSuccess(detail);
        }

        if (mode === "create") {
            formEl.reset();

            if (categoryInput) {
                categoryInput.value = "";
            }
        }
    } catch (error) {
        console.error(mode === "edit" ? "Vendor update error:" : "Vendor registration error:", error);

        Notify(
            normalizeErrorMessage(error) || (mode === "edit" ? "Failed to update vendor. Please try again." : "Failed to register vendor. Please try again."),
            {
                type: "error",
                duration: 3000
            }
        );
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = previousLabel || (mode === "edit" ? "Save Changes" : "Register as Vendor");
        }
    }
}

function createInput(attributes) {
    const safeAttributes = { ...attributes };
    if (safeAttributes.className) {
        safeAttributes.class = safeAttributes.className;
        delete safeAttributes.className;
    }
    return createElement("input", safeAttributes);
}

function createTextarea(attributes) {
    const safeAttributes = { ...attributes };
    if (safeAttributes.className) {
        safeAttributes.class = safeAttributes.className;
        delete safeAttributes.className;
    }
    return createElement("textarea", safeAttributes);
}