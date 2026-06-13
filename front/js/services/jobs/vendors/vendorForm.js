import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";

/**
 * Vendor registration form component
 * Allows users to register as a vendor
 */
export function vendorForm(anacon, isLoggedIn, eventId, onSuccess = null) {
    const form = document.createElement("form");
    form.className = "vendor-registration-form";
    form.noValidate = true;

    const title = document.createElement("h4");
    title.textContent = "List Yourself as a Vendor";
    form.appendChild(title);

    const nameInput = createInput({
        type: "text",
        placeholder: "Your Full Name",
        name: "name",
        required: true,
        className: "form-input"
    });

    const categorySelect = document.createElement("select");
    categorySelect.name = "category";
    categorySelect.required = true;
    categorySelect.className = "form-input";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Select a Category";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
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
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        categorySelect.appendChild(option);
    }

    const descriptionInput = createTextarea({
        name: "description",
        placeholder: "Brief description of your services (optional)",
        className: "form-input",
        rows: 3
    });

    const emailInput = createInput({
        type: "email",
        placeholder: "Contact Email (optional)",
        name: "email",
        className: "form-input"
    });

    const phoneInput = createInput({
        type: "tel",
        placeholder: "Contact Phone (optional)",
        name: "phone",
        className: "form-input"
    });

    const locationInput = createInput({
        type: "text",
        placeholder: "Location/Service Area (optional)",
        name: "location",
        className: "form-input"
    });

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.id = `vendor-submit-${Math.random().toString(36).slice(2, 10)}`;
    submitButton.className = "btn-primary";
    submitButton.textContent = "Register as Vendor";

    form.appendChild(nameInput);
    form.appendChild(categorySelect);
    form.appendChild(descriptionInput);
    form.appendChild(emailInput);
    form.appendChild(phoneInput);
    form.appendChild(locationInput);
    form.appendChild(submitButton);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleVendorRegistration(form, isLoggedIn, eventId, onSuccess);
    });

    return form;
}

async function handleVendorRegistration(formEl, isLoggedIn, eventId, onSuccess) {
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

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Registering...";
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

        const response = await apiFetch("/vendors", "POST", payload);

        if (response?.success === false) {
            throw new Error(response.error || "Failed to register vendor.");
        }

        Notify("Vendor registered successfully!", {
            type: "success",
            duration: 3000
        });

        formEl.reset();

        if (typeof onSuccess === "function") {
            await onSuccess({
                eventId,
                isLoggedIn,
                response,
                payload
            });
        } else if (typeof document !== "undefined" && typeof CustomEvent === "function") {
            document.dispatchEvent(
                new CustomEvent("vendor-registered", {
                    detail: { eventId, response, payload }
                })
            );
        }
    } catch (error) {
        console.error("Vendor registration error:", error);
        Notify(
            error?.message || "Failed to register vendor. Please try again.",
            { type: "error", duration: 3000 }
        );
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Register as Vendor";
        }
    }
}

function createInput(attributes) {
    const input = document.createElement("input");
    for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
            if (key === "className") {
                input.className = value;
            } else {
                input.setAttribute(key, String(value));
            }
        }
    }
    return input;
}

function createTextarea(attributes) {
    const textarea = document.createElement("textarea");
    for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
            if (key === "className") {
                textarea.className = value;
            } else {
                textarea.setAttribute(key, String(value));
            }
        }
    }
    return textarea;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}